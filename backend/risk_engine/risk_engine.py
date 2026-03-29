import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import pickle
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def calculate_risk(weights=None):
    """
    Vectorized risk engine for fleet-scale prioritization.
    Weights default to: {safety: 0.5, operational: 0.3, cost: 0.2}
    """
    print(f"--- Running Vectorized Risk Engine (Weights: {weights}) ---")
    start_time = datetime.now()
    
    if weights is None:
        weights = {"safety": 0.5, "operational": 0.3, "cost": 0.2}
        
    # 1. Load Data
    # We use component_features as base because it already has all 16+ features pre-computed
    df_features = pd.read_sql("SELECT * FROM component_features", engine)
    df_comp_meta = pd.read_sql("SELECT component_id, safety_score, operational_score, cost_score FROM component", engine)
    
    # 2. Get Failure Probabilities from ML Model
    try:
        with open("models/model_v3.pkl", "rb") as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print("Model file not found. Falling back to simple heuristic for first run.")
        # Heuristic: prob based on age and sensors
        probs = (df_features['mtbf_ratio'] * 0.5) + (df_features['sensor_mean_7d'] / 200.0 * 0.5)
        df_features['failure_probability'] = probs.clip(0, 1)
    else:
        # ML Model Inference
        X = df_features # Feature engineering ensures columns match ColumnTransformer
        probs = model.predict_proba(X)[:, 1]
        df_features['failure_probability'] = probs

    # 3. Vectorized Risk Score Computation
    df_merged = df_features.merge(df_comp_meta, on='component_id')
    
    # Impact = (w1 x Safety) + (w2 x Operational) + (w3 x Cost)
    df_merged['impact_score'] = (
        weights['safety'] * df_merged['safety_score'] +
        weights['operational'] * df_merged['operational_score'] +
        weights['cost'] * df_merged['cost_score']
    )
    
    # Risk Score = P(failure) x Impact
    df_merged['risk_score'] = df_merged['failure_probability'] * df_merged['impact_score']
    
    # Risk Level
    def get_tier(score):
        if score > 0.60: return "HIGH"
        if score > 0.30: return "MEDIUM"
        return "LOW"
    
    df_merged['risk_level'] = df_merged['risk_score'].apply(get_tier)
    
    # 4. Detect Tier Changes (vs Last Snapshot)
    # Get last snapshot for comparison
    try:
        last_snap = pd.read_sql("""
            SELECT component_id, risk_level as last_level 
            FROM risk_snapshot 
            WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM risk_snapshot)
        """, engine)
    except:
        last_snap = pd.DataFrame(columns=['component_id', 'last_level'])
        
    if not last_snap.empty:
        df_merged = df_merged.merge(last_snap, on='component_id', how='left')
        df_merged['tier_changed_to_high'] = (
            (df_merged['risk_level'] == 'HIGH') & 
            (df_merged['last_level'] != 'HIGH')
        ).astype(int)
    else:
        df_merged['tier_changed_to_high'] = 0

    # 5. Store Snapshot
    df_snap = pd.DataFrame({
        "component_id": df_merged["component_id"],
        "snapshot_date": datetime.now(),
        "failure_probability": df_merged["failure_probability"],
        "impact_score": df_merged["impact_score"],
        "risk_score": df_merged["risk_score"],
        "risk_level": df_merged["risk_level"],
        "is_training_instance": False, # Live recomputation
        "failure_label": 0 # Live recomputation
    })
    
    df_snap.to_sql('risk_snapshot', engine, if_exists='append', index=False)
    
    # Clean up old snapshots (Optional: Keep last 30 days)
    # with engine.connect() as con:
    #     con.execute(text("DELETE FROM risk_snapshot WHERE snapshot_date < NOW() - INTERVAL '30 days'"))
    #     con.commit()
    
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"Risk computation complete for {len(df_merged)} components in {elapsed:.2f} seconds.")
    return len(df_merged), elapsed

if __name__ == "__main__":
    calculate_risk()
