import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_recall_curve, 
    f1_score, brier_score_loss, auc, confusion_matrix
)
from sklearn.calibration import calibration_curve
import mlflow
import mlflow.sklearn
import pickle
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def train_and_predict():
    print("--- Starting ML model training (GroupKFold + Alignment v3) ---")
    
    # 1. Load Feature Data
    df = pd.read_sql("SELECT * FROM component_features", engine)
    
    # Column mapping
    num_features = [
        'days_since_last_maintenance', 'historical_failure_count', 'component_age_hours',
        'sensor_mean_7d', 'sensor_std_7d', 'sensor_trend_slope',
        'aircraft_age_years', 'flight_cycles_30d', 'utilization_intensity',
        'anomaly_count_30d', 'missing_data_rate_7d', 'mtbf_ratio'
    ]
    cat_features = ['climate_zone', 'system_category']
    
    X = df[num_features + cat_features]
    y = df['label']
    groups = df['aircraft_id_group']
    
    if y.nunique() < 2:
        print("WARNING: Only one class found in labels (no failures). Skipping actual training to avoid solver crash.")
        print("System will use fallback risk heuristics for this run.")
        return
    
    # Stratified Group Split (Manual for validation/test set holding out aircraft)
    # We hold out 30% of aircraft for val/test
    all_aircraft = groups.unique()
    np.random.shuffle(all_aircraft)
    train_split = int(len(all_aircraft) * 0.7)
    val_split = int(len(all_aircraft) * 0.85)
    
    train_ac = all_aircraft[:train_split]
    val_ac = all_aircraft[train_split:val_split]
    test_ac = all_aircraft[val_split:]
    
    X_train, y_train = X[groups.isin(train_ac)], y[groups.isin(train_ac)]
    X_val, y_val = X[groups.isin(val_ac)], y[groups.isin(val_ac)]
    X_test, y_test = X[groups.isin(test_ac)], y[groups.isin(test_ac)]
    
    print(f"Training on {len(X_train)} instances ({len(train_ac)} aircraft)")
    print(f"Testing on {len(X_test)} instances ({len(test_ac)} aircraft)")
    
    # 2. Pipeline Definition
    preprocessor = ColumnTransformer([
        ('num', Pipeline([
            ('impute', SimpleImputer(strategy='constant', fill_value=0)),
            ('scale', StandardScaler())
        ]), num_features),
        ('cat', Pipeline([
            ('impute', SimpleImputer(strategy='constant', fill_value='unknown')),
            ('encode', OneHotEncoder(handle_unknown='ignore'))
        ]), cat_features)
    ])
    
    mlflow.set_tracking_uri("http://mlflow:5000")
    mlflow.set_experiment("RBAMPS-Enterprise-Benchmarking")
    
    models_to_train = {
        "Baseline_Logistic": LogisticRegression(class_weight='balanced', max_iter=1000),
        "Primary_GradientBoosting": GradientBoostingClassifier(n_estimators=150, learning_rate=0.05, max_depth=4, random_state=42),
        "Secondary_RandomForest": GradientBoostingClassifier(n_estimators=100, max_depth=6, random_state=42) # Using GB variant for consistency in importance
    }

    best_prauc = 0
    best_model_name = ""
    best_pipe = None

    for name, clf in models_to_train.items():
        with mlflow.start_run(run_name=name):
            pipe = Pipeline([('pre', preprocessor), ('clf', clf)])
            pipe.fit(X_train, y_train)
            
            # Eval on test set
            y_probs = pipe.predict_proba(X_test)[:, 1]
            y_preds = (y_probs >= 0.3).astype(int)
            
            # Calculate Metrics
            auc_roc = roc_auc_score(y_test, y_probs)
            precision, recall, _ = precision_recall_curve(y_test, y_probs)
            pr_auc = auc(recall, precision)
            f1_03 = f1_score(y_test, y_preds)
            brier = brier_score_loss(y_test, y_probs)
            
            # Feature Importance (if applicable)
            if hasattr(clf, 'feature_importances_'):
                ohe_cats = pipe.named_steps['pre'].transformers_[1][1].get_feature_names_out(cat_features)
                feature_names = num_features + list(ohe_cats)
                importances = clf.feature_importances_
                for f_name, imp in zip(feature_names, importances):
                    mlflow.log_metric(f"importance_{f_name}", imp)

            # Logging
            mlflow.log_param("algorithm", name)
            mlflow.log_metric("auc_roc", auc_roc)
            mlflow.log_metric("pr_auc", pr_auc)
            mlflow.log_metric("f1_at_03", f1_03)
            mlflow.log_metric("brier_score", brier)
            mlflow.sklearn.log_model(pipe, f"{name}_pipeline")
            
            print(f"Model {name} trained. PR-AUC: {pr_auc:.3f}")
            
            if pr_auc > best_prauc:
                best_prauc = pr_auc
                best_model_name = name
                best_pipe = pipe

    # Save the best model for production engine
    os.makedirs("models", exist_ok=True)
    with open("models/model_v3.pkl", "wb") as f:
        pickle.dump(best_pipe, f)
    
    with mlflow.start_run(run_name="SUMMARY_REPORT"):
        mlflow.log_param("best_algorithm", best_model_name)
        mlflow.log_metric("best_prauc", best_prauc)
        print(f"--- BENCHMARKING COMPLETE ---")
        print(f"🏆 Best Model: {best_model_name} with PR-AUC: {best_prauc:.3f}")

    # 3. Generate Predictions for all components to populate RiskSnapshot initial view
    # But actually, risk_engine.py will do the vectorized computation for live scores.
    # This script just prepares the model.
    print("Model serialization complete.")

if __name__ == "__main__":
    train_and_predict()
