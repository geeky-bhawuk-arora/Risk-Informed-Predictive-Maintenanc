import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import pickle
from datetime import datetime

from backend.db import models

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

DEFAULT_WEIGHTS = {"safety": 0.5, "operational": 0.3, "cost": 0.2}


def normalize_weights(weights=None):
    merged = {**DEFAULT_WEIGHTS, **(weights or {})}
    total = sum(merged.values())
    if total <= 0:
        return DEFAULT_WEIGHTS.copy()
    return {key: value / total for key, value in merged.items()}


def get_current_weights(db: Session):
    config = db.query(models.RiskConfig).order_by(models.RiskConfig.config_id.desc()).first()
    if not config:
        config = models.RiskConfig(
            safety_weight=DEFAULT_WEIGHTS["safety"],
            operational_weight=DEFAULT_WEIGHTS["operational"],
            cost_weight=DEFAULT_WEIGHTS["cost"],
            updated_at=datetime.utcnow(),
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return {
        "safety": float(config.safety_weight),
        "operational": float(config.operational_weight),
        "cost": float(config.cost_weight),
        "updated_at": config.updated_at,
    }


def save_weights(db: Session, weights):
    normalized = normalize_weights(weights)
    config = db.query(models.RiskConfig).order_by(models.RiskConfig.config_id.desc()).first()
    if not config:
        config = models.RiskConfig()
        db.add(config)

    config.safety_weight = normalized["safety"]
    config.operational_weight = normalized["operational"]
    config.cost_weight = normalized["cost"]
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    return {
        "safety": config.safety_weight,
        "operational": config.operational_weight,
        "cost": config.cost_weight,
        "updated_at": config.updated_at,
    }

def calculate_risk(weights=None):
    """
    Vectorized risk engine for fleet-scale prioritization.
    Weights default to: {safety: 0.5, operational: 0.3, cost: 0.2}
    """
    print(f"--- Running Vectorized Risk Engine (Weights: {weights}) ---")
    start_time = datetime.now()
    
    weights = normalize_weights(weights)
        
    # 1. Load Data
    # We use component_features as base because it already has all 16+ features pre-computed
    df_features = pd.read_sql("SELECT * FROM component_features", engine)
    df_comp_meta = pd.read_sql("SELECT component_id, safety_score, operational_score, cost_score FROM component", engine)
    
    # 2. Get Failure Probabilities from ML Model
    try:
        with open("models/model_v3.pkl", "rb") as f:
            model = pickle.load(f)
        # ML Model Inference
        X = df_features
        probs = model.predict_proba(X)[:, 1]
        df_features['failure_probability'] = probs
    except (FileNotFoundError, Exception) as e:
        print(f"Model error or not found ({e}). Falling back to robust heuristic.")
        # Heuristic: base prob + age-based decay + sensor anomalies
        base_p = 0.05
        age_p = (df_features['component_age_hours'] / 8000.0) * 0.4
        sensor_p = (df_features['sensor_std_7d'] / 50.0) * 0.3
        anomaly_p = (df_features['anomaly_count_30d'] / 10.0) * 0.25
        
        probs = base_p + age_p + sensor_p + anomaly_p
        # Add tiny jitter to ensure ranking variety
        probs += np.random.uniform(0, 0.01, size=len(probs))
        df_features['failure_probability'] = probs.clip(0, 1)

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

    # 5. Calculate Risk Drivers (Local explainability)
    # Compare each component to the fleet mean for major features
    risk_drivers_list = []
    
    # Select features to monitor for drivers
    driver_features = [
        'sensor_trend_slope', 'anomaly_count_30d', 'mtbf_ratio', 
        'historical_failure_count', 'days_since_last_maintenance', 
        'component_age_hours', 'utilization_intensity'
    ]
    
    fleet_stats = df_features[driver_features].agg(['mean', 'std']).to_dict()
    
    for idx, row in df_merged.iterrows():
        drivers = []
        for feat in driver_features:
            val = row[feat]
            mean = fleet_stats[feat]['mean']
            std = fleet_stats[feat]['std'] or 1e-6
            
            # If feature is 1.5 standard deviations above mean, it's a driver
            if val > mean + 1.5 * std:
                friendly_name = feat.replace('_', ' ').title()
                drivers.append(friendly_name)
        
        risk_drivers_list.append(", ".join(drivers) if drivers else "Fleet Baseline")

    # 6. Store Snapshot
    df_snap = pd.DataFrame({
        "component_id": df_merged["component_id"],
        "snapshot_date": datetime.now(),
        "failure_probability": df_merged["failure_probability"],
        "impact_score": df_merged["impact_score"],
        "risk_score": df_merged["risk_score"],
        "risk_level": df_merged["risk_level"],
        "is_training_instance": False, 
        "failure_label": 0,
        "risk_drivers": risk_drivers_list
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
