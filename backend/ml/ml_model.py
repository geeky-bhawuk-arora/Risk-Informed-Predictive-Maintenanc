import os
import pandas as pd
from sqlalchemy import create_engine, text
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import mlflow
import pickle
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def train_and_predict():
    print("Starting ML Model Training and Prediction...")
    
    # 1. Load Data for Training
    # Normally we'd use historical failures as labels. 
    # For this synthetic case, we'll derive a label: did it fail in the last 30 days?
    # To keep the simulation realistic for the predictive model, we'll artificially label components 
    # with high vibration/temperature and older age as historical "failures" for training.
    
    query_features = "SELECT * FROM COMPONENT_FEATURES"
    df = pd.read_sql(query_features, engine)
    
    # Synthetic label creation for demonstration purposes (since we don't have past features snapshots)
    # Failure probability increases with: time since maint, avg temp > 90, high vib trend
    df['label'] = ((df['time_since_last_maint'] > 60) | 
                   (df['avg_temp_30d'] > 95) | 
                   (df['vibration_trend'] > 0.05)).astype(int)
    
    # Map criticality
    crit_map = {'Low': 0, 'Medium': 1, 'High': 2}
    df['component_criticality_encoded'] = df['component_criticality'].map(crit_map).fillna(1)
    
    feature_cols = [
        'time_since_last_maint', 'failure_count_90d', 'avg_temp_30d', 
        'vibration_trend', 'usage_intensity', 'aircraft_age', 'component_criticality_encoded'
    ]
    
    X = df[feature_cols].fillna(0)
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    X_all_scaled = scaler.transform(X)
    
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment("aircraft-failure-prediction")
    
    with mlflow.start_run():
        model = LogisticRegression(random_state=42)
        model.fit(X_train_scaled, y_train)
        
        preds = model.predict(X_test_scaled)
        acc = accuracy_score(y_test, preds)
        
        mlflow.log_metric("accuracy", acc)
        mlflow.sklearn.log_model(model, "logistic_regression")
        
        print(f"Model trained. Accuracy: {acc:.2f}")
        
        # Save model and scaler
        os.makedirs("models", exist_ok=True)
        with open("models/model.pkl", "wb") as f:
            pickle.dump(model, f)
        with open("models/scaler.pkl", "wb") as f:
            pickle.dump(scaler, f)
    
    # Predict failure probability for the next 30 days
    probs = model.predict_proba(X_all_scaled)[:, 1]
    
    df_preds = pd.DataFrame({
        'aircraft_id': df['aircraft_id'],
        'component_id': df['component_id'],
        'prediction_horizon': 30,
        'failure_probability': probs,
        'model_version': 'logreg_v1',
        'prediction_timestamp': pd.Timestamp.now()
    })
    
    # Save to database
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE FAILURE_PROBABILITY CASCADE;"))
        con.commit()
        
    df_preds.to_sql('failure_probability', engine, if_exists='append', index=False)
    print(f"Predictions saved. {len(df_preds)} probability records inserted.")

if __name__ == "__main__":
    train_and_predict()
