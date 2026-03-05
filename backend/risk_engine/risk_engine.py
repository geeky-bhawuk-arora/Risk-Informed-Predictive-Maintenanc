import os
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def calculate_risk():
    print("Starting Risk Calculation Engine...")
    
    # Load Probabilities
    q_probs = "SELECT aircraft_id, component_id, failure_probability FROM FAILURE_PROBABILITY"
    df_probs = pd.read_sql(q_probs, engine)
    
    # Load Components & Impact Scores
    q_comps = """
        SELECT c.component_id, c.component_type, i.safety_impact, i.operational_impact, i.cost_impact
        FROM COMPONENT c
        JOIN IMPACT_SCORE i ON c.component_type = i.component_type
    """
    df_comps = pd.read_sql(q_comps, engine)
    
    # Merge
    df = pd.merge(df_probs, df_comps, on='component_id')
    
    # Impact formula: 0.5 * safety + 0.3 * operational + 0.2 * cost
    df['impact_score'] = 0.5 * df['safety_impact'] + 0.3 * df['operational_impact'] + 0.2 * df['cost_impact']
    
    # Risk Score
    df['risk_score'] = df['failure_probability'] * df['impact_score']
    
    # Risk Levels
    def get_risk_level(score):
        if score > 0.6:
            return "High"
        elif score > 0.3:
            return "Medium"
        else:
            return "Low"
            
    df['risk_level'] = df['risk_score'].apply(get_risk_level)
    
    # Dominant Driver
    def get_dominant_driver(row):
        scores = {
            "Safety": row['safety_impact'] * 0.5,
            "Operational": row['operational_impact'] * 0.3,
            "Cost": row['cost_impact'] * 0.2
        }
        return max(scores, key=scores.get)
        
    df['dominant_driver'] = df.apply(get_dominant_driver, axis=1)
    df['computed_at'] = pd.Timestamp.now()
    
    df_risk = df[['aircraft_id', 'component_id', 'failure_probability', 'impact_score', 'risk_score', 'risk_level', 'dominant_driver', 'computed_at']]
    
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE RISK_SCORE CASCADE;"))
        con.commit()
    
    df_risk.to_sql('risk_score', engine, if_exists='append', index=False)
    print(f"Risk profiles generated: {len(df_risk)} records.")
    
    generate_priorities(df_risk)

def generate_priorities(df_risk):
    print("Generating Maintenance Priorities...")
    
    # Sort by risk descending
    df_ranked = df_risk.sort_values(by='risk_score', ascending=False).reset_index(drop=True)
    df_ranked['priority_rank'] = df_ranked.index + 1
    
    def get_action_and_reason(row):
        level = row['risk_level']
        prob = row['failure_probability']
        impact = row['impact_score']
        driver = row['dominant_driver']
        
        if level == "High":
            action = "Immediate Inspection / Replace"
            reason = f"Critical risk condition driven by {driver} Impact."
        elif level == "Medium":
            action = "Schedule Maintenance within 7 days"
            reason = f"Elevated expected failure rate ({prob*100:.1f}%)."
        else:
            action = "Monitor during routine checks"
            reason = "Acceptable risk levels."
            
        return action, reason

    actions_reasons = df_ranked.apply(get_action_and_reason, axis=1)
    df_ranked['recommended_action'] = [x[0] for x in actions_reasons]
    df_ranked['reasoning'] = [x[1] for x in actions_reasons]
    df_ranked['generated_at'] = pd.Timestamp.now()
    
    df_prio = df_ranked[['aircraft_id', 'component_id', 'priority_rank', 'risk_score', 'recommended_action', 'reasoning', 'generated_at']]
    
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE MAINTENANCE_PRIORITY CASCADE;"))
        con.commit()
        
    df_prio.to_sql('maintenance_priority', engine, if_exists='append', index=False)
    print(f"Priority rankings generated: {len(df_prio)} records.")

if __name__ == "__main__":
    calculate_risk()
