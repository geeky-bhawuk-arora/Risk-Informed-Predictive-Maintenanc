import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from scipy.stats import linregress
from datetime import datetime, timedelta

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def run_feature_engineering():
    print("Starting Feature Engineering...")
    
    # 1. Load data
    df_comps = pd.read_sql("SELECT * FROM component", engine)
    df_aircraft = pd.read_sql("SELECT * FROM aircraft", engine)
    df_maint = pd.read_sql("SELECT * FROM maintenance_log", engine)
    df_sensors = pd.read_sql("SELECT * FROM sensor_data WHERE timestamp >= NOW() - INTERVAL '30 days'", engine)
    df_flights = pd.read_sql("SELECT * FROM flight_operations WHERE departure_time >= NOW() - INTERVAL '30 days'", engine)
    
    now = pd.Timestamp.now()
    features_list = []
    
    for _, comp in df_comps.iterrows():
        comp_id = comp['component_id']
        ac_id = comp['aircraft_id']
        
        # 1. days_since_last_maintenance
        comp_maint = df_maint[df_maint['component_id'] == comp_id]
        if not comp_maint.empty:
            last_maint_date = pd.to_datetime(comp_maint['maintenance_date']).max()
            days_since_maint = (now - last_maint_date).days
        else:
            days_since_maint = (now - pd.to_datetime(comp['installation_date'])).days
            
        # 2. historical_failure_count (unscheduled in past 12 months)
        past_12m = now - timedelta(days=365)
        failure_count = comp_maint[
            (comp_maint['type'].str.lower() == 'unscheduled') & 
            (pd.to_datetime(comp_maint['maintenance_date']) >= past_12m)
        ].shape[0]
        
        # 3. component_age_hours
        comp_age_hours = comp['age_hours']
        
        # Sensor data for this component
        comp_sensors = df_sensors[df_sensors['component_id'] == comp_id]
        
        # 4 & 5. sensor_mean_7d, sensor_std_7d
        past_7d = now - timedelta(days=7)
        sensors_7d = comp_sensors[pd.to_datetime(comp_sensors['timestamp']) >= past_7d]
        if not sensors_7d.empty:
            s_mean = sensors_7d['value'].mean()
            s_std = sensors_7d['value'].std()
        else:
            s_mean = 0.0
            s_std = 0.0
            
        # 6. sensor_trend_slope (30 days)
        if len(comp_sensors) >= 5:
            # Convert timestamp to ordinal for regression
            x = pd.to_datetime(comp_sensors['timestamp']).apply(lambda t: t.to_ordinal()).values
            y = comp_sensors['value'].values
            slope, _, _, _, _ = linregress(x, y)
        else:
            slope = 0.0
            
        # 7. aircraft_age_years
        ac_info = df_aircraft[df_aircraft['aircraft_id'] == ac_id]
        if not ac_info.empty:
            ac_age_years = (now - pd.to_datetime(ac_info['manufacture_date'].iloc[0])).days / 365.25
        else:
            ac_age_years = 0.0
            
        # 8. flight_cycles_30d
        ac_flights = df_flights[df_flights['aircraft_id'] == ac_id]
        cycles_30d = ac_flights['cycles_incremented'].sum()
        
        # 9. utilization_intensity (actual / planned)
        # Assuming planned is 12 hours/day
        actual_hours = ac_flights['duration_hours'].sum()
        planned_hours = 30 * 12.0
        utilization = actual_hours / planned_hours if planned_hours > 0 else 0
        
        features_list.append({
            "component_id": comp_id,
            "days_since_last_maintenance": float(days_since_maint),
            "historical_failure_count": int(failure_count),
            "component_age_hours": float(comp_age_hours),
            "sensor_mean_7d": float(s_mean),
            "sensor_std_7d": float(s_std),
            "sensor_trend_slope": float(slope),
            "aircraft_age_years": float(ac_age_years),
            "flight_cycles_30d": int(cycles_30d),
            "utilization_intensity": float(utilization),
            "feature_timestamp": now
        })
        
    df_features = pd.DataFrame(features_list)
    
    # Save to database
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE component_features RESTART IDENTITY;"))
        con.commit()
    
    df_features.to_sql('component_features', engine, if_exists='append', index=False)
    print(f"Feature engineering completed. Wrote {len(df_features)} records.")

if __name__ == "__main__":
    run_feature_engineering()

if __name__ == "__main__":
    run_feature_engineering()
