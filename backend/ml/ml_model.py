import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_recall_curve, 
    f1_score, brier_score_loss, auc
)
import mlflow
import mlflow.sklearn
import pickle
from datetime import datetime, timedelta

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def train_and_predict():
    print("Starting ML Model Training and Prediction...")
    
    # 1. Load data
    df_features = pd.read_sql("SELECT * FROM component_features", engine)
    df_maint = pd.read_sql("SELECT component_id, maintenance_date, type FROM maintenance_log", engine)
    
    # 2. Derive labels (Ground Truth)
    # Binary label: 1 if an unscheduled maintenance event occurs within 30 days of the observation
    # Since we are using the 'current' snapshot, we check if there are future unscheduled events
    # relative to the feature_timestamp. 
    labels = []
    for _, row in df_features.iterrows():
        comp_id = row['component_id']
        obs_time = pd.to_datetime(row['feature_timestamp'])
        lookahead_limit = obs_time + timedelta(days=30)
        
        future_failures = df_maint[
            (df_maint['component_id'] == comp_id) & 
            (df_maint['type'].str.lower() == 'unscheduled') & 
            (pd.to_datetime(df_maint['maintenance_date']) > obs_time) & 
            (pd.to_datetime(df_maint['maintenance_date']) <= lookahead_limit)
        ]
        labels.append(1 if not future_failures.empty else 0)
    
    df_features['label'] = labels
    
    # Feature columns
    feature_cols = [
        'days_since_last_maintenance', 'historical_failure_count', 'component_age_hours',
        'sensor_mean_7d', 'sensor_std_7d', 'sensor_trend_slope',
        'aircraft_age_years', 'flight_cycles_30d', 'utilization_intensity'
    ]
    
    X = df_features[feature_cols].fillna(0)
    y = df_features['label']
    
    # Check class distribution
    if y.sum() == 0:
        print("Warning: No failures found in lookahead period. Using synthetic labels for demonstration.")
        # Fallback to avoid training failure if generator hasn't produced future failures yet
        y = ((X['sensor_mean_7d'] > X['sensor_mean_7d'].mean()) & (X['sensor_trend_slope'] > 0)).astype(int)

    # 3. Train/Test Split (Stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.sum() > 1 else None
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    X_all_scaled = scaler.transform(X)
    
    mlflow.set_tracking_uri("http://mlflow:5000") # Docker service name
    mlflow.set_experiment("RBAMPS-Engine")
    
    with mlflow.start_run():
        # Gradient Boosting (Primary)
        model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Predictions
        y_probs = model.predict_proba(X_test_scaled)[:, 1]
        y_preds = (y_probs >= 0.3).astype(int) # Using threshold 0.3 as per spec
        
        # Metrics
        auc_roc = roc_auc_score(y_test, y_probs)
        precision, recall, _ = precision_recall_curve(y_test, y_probs)
        pr_auc = auc(recall, precision)
        f1 = f1_score(y_test, y_preds)
        brier = brier_score_loss(y_test, y_probs)
        
        # Log Hyperparameters
        mlflow.log_params(model.get_params())
        
        # Log Metrics
        mlflow.log_metric("auc_roc", auc_roc)
        mlflow.log_metric("pr_auc", pr_auc)
        mlflow.log_metric("f1_at_0.3", f1)
        mlflow.log_metric("brier_score", brier)
        
        # Feature Importance
        importances = model.feature_importances_
        for i, val in enumerate(importances):
            mlflow.log_metric(f"importance_{feature_cols[i]}", val)
            
        mlflow.sklearn.log_model(model, "gbm_model")
        
        # Save model and scaler locally
        os.makedirs("models", exist_ok=True)
        with open("models/model.pkl", "wb") as f:
            pickle.dump(model, f)
        with open("models/scaler.pkl", "wb") as f:
            pickle.dump(scaler, f)
            
        print(f"Model trained. AUC-ROC: {auc_roc:.2f}, F1: {f1:.2f}")

    # 4. Generate Predictions for all components
    all_probs = model.predict_proba(X_all_scaled)[:, 1]
    
    df_preds = pd.DataFrame({
        'component_id': df_features['component_id'],
        'failure_probability': all_probs,
        'computed_at': pd.Timestamp.now()
    })
    
    # Save to database (re-mapping to risk process)
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE risk_score RESTART IDENTITY;"))
        con.commit()
    
    # We'll insert into risk_score directly here or let risk_engine handle it
    # Risk engine expects failure_probability. Let's create a temp table or use the risk_score table.
    # The spec says Risk engine computes Risk Score = P(failure) * Impact.
    # So we'll save P(failure) somewhere.
    df_preds.to_sql('risk_score', engine, if_exists='append', index=False)
    print(f"Probabilities saved to risk_score table.")

if __name__ == "__main__":
    train_and_predict()
