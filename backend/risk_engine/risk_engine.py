import os
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, date

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def calculate_risk(safety_w=0.5, operational_w=0.3, cost_w=0.2):
    print(f"Starting Risk Calculation Engine (Weights: S={safety_w}, O={operational_w}, C={cost_w})...")
    
    # 1. Load Probabilities (from risk_score where only failure_probability is populated currently)
    df_risk = pd.read_sql("SELECT component_id, failure_probability FROM risk_score", engine)
    
    # 2. Load Components for Impact sub-scores
    df_comps = pd.read_sql("SELECT component_id, safety_impact, operational_impact, cost_impact FROM component", engine)
    
    # Merge
    df = pd.merge(df_risk, df_comps, on='component_id')
    
    # 3. Impact Calculation
    # Impact = (0.5 × Safety) + (0.3 × Operational) + (0.2 × Cost)
    df['impact_score'] = (safety_w * df['safety_impact']) + \
                        (operational_w * df['operational_impact']) + \
                        (cost_w * df['cost_impact'])
    
    # 4. Risk Score Calculation
    # Risk Score = P(failure) × Impact
    df['risk_score'] = df['failure_probability'] * df['impact_score']
    
    # 5. Assign Priority Tiers
    # - HIGH (Risk > 0.60) → Immediate inspection within 24 hours
    # - MEDIUM (0.30–0.60) → Scheduled maintenance within 7 days
    # - LOW (< 0.30) → Monitor, no immediate action
    def get_risk_level(score):
        if score > 0.6: return "HIGH"
        elif score >= 0.3: return "MEDIUM"
        else: return "LOW"
            
    df['risk_level'] = df['risk_score'].apply(get_risk_level)
    df['computed_at'] = pd.Timestamp.now()
    
    # Update risk_score table
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE risk_score RESTART IDENTITY;"))
        con.commit()
    
    df_final_risk = df[['component_id', 'failure_probability', 'impact_score', 'risk_score', 'risk_level', 'computed_at']]
    df_final_risk.to_sql('risk_score', engine, if_exists='append', index=False)
    
    # 6. Save to Risk Trend (Daily Snapshot)
    today = date.today()
    df_trend = df[['component_id', 'risk_score']].copy()
    df_trend['timestamp'] = today
    
    # Avoid duplicate trend entries for the same day
    with engine.connect() as con:
        con.execute(text(f"DELETE FROM risk_trend WHERE timestamp = '{today}'"))
        con.commit()
    df_trend.to_sql('risk_trend', engine, if_exists='append', index=False)
    
    # 7. Generate Maintenance Priorities
    generate_priorities(df)

def generate_priorities(df):
    print("Generating Maintenance Priority List...")
    
    # Sort by risk score descending
    df_ranked = df.sort_values(by='risk_score', ascending=False).reset_index(drop=True)
    df_ranked['priority_rank'] = df_ranked.index + 1
    
    def get_action(level):
        if level == "HIGH": return "Immediate inspection within 24 hours"
        elif level == "MEDIUM": return "Scheduled maintenance within 7 days"
        else: return "Monitor, no immediate action"

    df_ranked['recommended_action'] = df_ranked['risk_level'].apply(get_action)
    df_ranked['generated_at'] = pd.Timestamp.now()
    
    df_prio = df_ranked[['component_id', 'priority_rank', 'risk_score', 'recommended_action', 'generated_at']]
    
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE maintenance_priority RESTART IDENTITY;"))
        con.commit()
        
    df_prio.to_sql('maintenance_priority', engine, if_exists='append', index=False)
    print(f"Priority list updated: {len(df_prio)} components ranked.")

if __name__ == "__main__":
    calculate_risk()

if __name__ == "__main__":
    calculate_risk()
