import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_recall_curve, 
    f1_score, brier_score_loss, auc, confusion_matrix,
    PrecisionRecallDisplay, RocCurveDisplay, ConfusionMatrixDisplay
)
from sklearn.calibration import calibration_curve, CalibratedClassifierCV
import matplotlib.pyplot as plt
import mlflow
import mlflow.sklearn
import pickle
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://bhawuk:Bhawuk%4042@localhost:5432/aeroguard_db")
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
        "Decision_Tree": DecisionTreeClassifier(max_depth=6, class_weight='balanced', random_state=42),
        "Random_Forest": RandomForestClassifier(n_estimators=100, max_depth=10, class_weight='balanced', random_state=42),
        "Primary_GradientBoosting": GradientBoostingClassifier(n_estimators=150, learning_rate=0.04, max_depth=5, random_state=42)
    }

    best_prauc = 0
    best_model_name = ""
    best_pipe = None

    for name, base_clf in models_to_train.items():
        with mlflow.start_run(run_name=name):
            # Practice: Model Calibration (Ensures risk scores are true probabilities)
            calibrated_clf = CalibratedClassifierCV(base_clf, cv=3, method='isotonic')
            pipe = Pipeline([('pre', preprocessor), ('clf', calibrated_clf)])
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
            
            # Feature Importance (if applicable - extraction from calibrated wrapper)
            if hasattr(calibrated_clf.calibrated_classifiers_[0].base_estimator, 'feature_importances_'):
                ohe_cats = pipe.named_steps['pre'].transformers_[1][1].get_feature_names_out(cat_features)
                feature_names = num_features + list(ohe_cats)
                # Average importance across CV folds
                importances = np.mean([c.base_estimator.feature_importances_ for c in calibrated_clf.calibrated_classifiers_], axis=0)
                for f_name, imp in zip(feature_names, importances):
                    mlflow.log_metric(f"importance_{f_name}", imp)

            # Logging
            mlflow.log_param("algorithm", name)
            mlflow.log_metric("auc_roc", auc_roc)
            mlflow.log_metric("pr_auc", pr_auc)
            mlflow.log_metric("f1_at_03", f1_03)
            mlflow.log_metric("brier_score", brier)
            
            # --- Artifact Generation: Plots ---
            os.makedirs("/tmp/ml_plots", exist_ok=True)
            
            # ROC Curve
            fig_roc, ax_roc = plt.subplots()
            RocCurveDisplay.from_estimator(pipe, X_test, y_test, ax=ax_roc)
            ax_roc.set_title(f"ROC Curve: {name}")
            roc_path = f"/tmp/ml_plots/roc_{name}.png"
            fig_roc.savefig(roc_path)
            mlflow.log_artifact(roc_path)
            plt.close(fig_roc)
            
            # PR Curve
            fig_pr, ax_pr = plt.subplots()
            PrecisionRecallDisplay.from_estimator(pipe, X_test, y_test, ax=ax_pr)
            ax_pr.set_title(f"PR Curve: {name}")
            pr_path = f"/tmp/ml_plots/pr_{name}.png"
            fig_pr.savefig(pr_path)
            mlflow.log_artifact(pr_path)
            plt.close(fig_pr)

            # Reliability Curve (Practice: Uncertainty Visualization)
            prob_true, prob_pred = calibration_curve(y_test, y_probs, n_bins=10)
            fig_rel, ax_rel = plt.subplots()
            ax_rel.plot(prob_pred, prob_true, marker='o', label=name)
            ax_rel.plot([0, 1], [0, 1], linestyle='--')
            ax_rel.set_title(f"Reliability Curve: {name}")
            rel_path = f"/tmp/ml_plots/reliability_{name}.png"
            fig_rel.savefig(rel_path)
            mlflow.log_artifact(rel_path)
            plt.close(fig_rel)

            # Confusion Matrix
            fig_cm, ax_cm = plt.subplots()
            ConfusionMatrixDisplay.from_predictions(y_test, y_preds, ax=ax_cm)
            ax_cm.set_title(f"Confusion Matrix: {name}")
            cm_path = f"/tmp/ml_plots/cm_{name}.png"
            fig_cm.savefig(cm_path)
            mlflow.log_artifact(cm_path)
            plt.close(fig_cm)
            
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
