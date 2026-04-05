import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import random

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def generate_historical_snapshots(days=30):
    print(f"--- Generating {days} days of historical risk snapshots ---")
    
    # 1. Get latest snapshots as base
    try:
        df_latest = pd.read_sql("""
            SELECT component_id, failure_probability, impact_score, risk_score, risk_level, risk_drivers
            FROM risk_snapshot
            WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM risk_snapshot)
        """, engine)
    except Exception as e:
        print(f"Error fetching latest snapshots: {e}")
        return

    if df_latest.empty:
        print("No base snapshots found. Please run the pipeline first.")
        return

    all_snapshots = []
    now = datetime.now()
    
    for i in range(1, days + 1):
        snapshot_date = now - timedelta(days=i)
        print(f"  Generating for {snapshot_date.date()}...")
        
        df_hist = df_latest.copy()
        df_hist["snapshot_date"] = snapshot_date
        
        # Add random walk variation to failure_probability and risk_score
        # We want to show a general "increasing" trend towards the current date if it's high risk,
        # or just stable if it's low.
        
        def adjust_prob(prob):
            # Move probability towards a lower value as we go back in time
            # with some noise
            variation = np.random.normal(-0.005, 0.01)
            new_prob = prob + (variation * i)
            return max(0.01, min(0.99, new_prob))

        df_hist["failure_probability"] = df_hist["failure_probability"].apply(adjust_prob)
        df_hist["risk_score"] = df_hist["failure_probability"] * df_hist["impact_score"]
        
        def get_tier(score):
            if score > 0.60: return "HIGH"
            if score > 0.30: return "MEDIUM"
            return "LOW"
        
        df_hist["risk_level"] = df_hist["risk_score"].apply(get_tier)
        
        # Prepare for DB
        df_to_save = df_hist[[
            "component_id", "snapshot_date", "failure_probability", 
            "impact_score", "risk_score", "risk_level", "risk_drivers"
        ]].copy()
        df_to_save["is_training_instance"] = False
        df_to_save["failure_label"] = 0
        
        all_snapshots.append(df_to_save)

    # Combine and save
    if all_snapshots:
        df_all = pd.concat(all_snapshots)
        df_all.to_sql('risk_snapshot', engine, if_exists='append', index=False)
        print(f"Successfully added {len(df_all)} historical snapshots.")

if __name__ == "__main__":
    generate_historical_snapshots()
