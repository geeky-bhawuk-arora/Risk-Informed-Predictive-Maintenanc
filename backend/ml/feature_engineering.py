import os
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def run_feature_engineering():
    print("Starting Feature Engineering...")
    
    # 1. Load Data
    query_comps = "SELECT component_id, aircraft_id, criticality_class FROM COMPONENT"
    df_comps = pd.read_sql(query_comps, engine)
    
    query_aircraft = "SELECT aircraft_id, entry_into_service_date FROM AIRCRAFT"
    df_aircraft = pd.read_sql(query_aircraft, engine)
    
    query_maint = "SELECT component_id, event_timestamp, unscheduled FROM MAINTENANCE_LOG"
    df_maint = pd.read_sql(query_maint, engine)
    
    query_sensors = "SELECT component_id, parameter, value, timestamp FROM SENSOR_READING WHERE timestamp >= NOW() - INTERVAL '30 days'"
    df_sensors = pd.read_sql(query_sensors, engine)
    
    query_flights = "SELECT aircraft_id, flight_hours FROM FLIGHT_OPERATION WHERE flight_date >= CURRENT_DATE - INTERVAL '30 days'"
    df_flights = pd.read_sql(query_flights, engine)
    
    now = pd.Timestamp.now()
    
    features = []
    
    # Aircraft Age
    df_aircraft['entry_into_service_date'] = pd.to_datetime(df_aircraft['entry_into_service_date'])
    df_aircraft['aircraft_age'] = (now - df_aircraft['entry_into_service_date']).dt.days / 365.25
    
    # Flight usage intensity per aircraft
    df_usage = df_flights.groupby('aircraft_id')['flight_hours'].sum().reset_index()
    df_usage.rename(columns={'flight_hours': 'usage_intensity'}, inplace=True)
    
    for _, comp in df_comps.iterrows():
        comp_id = comp['component_id']
        ac_id = comp['aircraft_id']
        
        # Maintenance Features
        comp_maint = df_maint[df_maint['component_id'] == comp_id]
        if not comp_maint.empty:
            last_maint = pd.to_datetime(comp_maint['event_timestamp'].max())
            time_since_last_maint = (now - last_maint).days
            # Failures in last 90 days (unscheduled maintenance)
            failures_90d = comp_maint[
                (comp_maint['unscheduled'] == True) & 
                (pd.to_datetime(comp_maint['event_timestamp']) >= now - pd.Timedelta(days=90))
            ].shape[0]
        else:
            time_since_last_maint = 999  # No maintenance recorded
            failures_90d = 0
            
        # Sensor Features
        comp_sensors = df_sensors[df_sensors['component_id'] == comp_id]
        
        avg_temp_30d = 80.0
        vibration_trend = 0.0
        
        if not comp_sensors.empty:
            temps = comp_sensors[comp_sensors['parameter'] == 'temperature']['value']
            vibs = comp_sensors[comp_sensors['parameter'] == 'vibration'].sort_values('timestamp')
            
            if not temps.empty:
                avg_temp_30d = temps.mean()
                
            if len(vibs) >= 2:
                # Simple linear trend
                vib_values = vibs['value'].values
                vibration_trend = vib_values[-1] - vib_values[0]
                
        # Aircraft Info
        ac_info = df_aircraft[df_aircraft['aircraft_id'] == ac_id]
        aircraft_age = ac_info['aircraft_age'].values[0] if not ac_info.empty else 5.0
        
        usage_info = df_usage[df_usage['aircraft_id'] == ac_id]
        usage_intensity = usage_info['usage_intensity'].values[0] if not usage_info.empty else 100.0
        
        features.append({
            "component_id": comp_id,
            "aircraft_id": ac_id,
            "time_since_last_maint": time_since_last_maint,
            "failure_count_90d": failures_90d,
            "avg_temp_30d": avg_temp_30d,
            "vibration_trend": vibration_trend,
            "usage_intensity": usage_intensity,
            "aircraft_age": aircraft_age,
            "component_criticality": comp['criticality_class'],
            "feature_timestamp": now
        })
        
    df_features = pd.DataFrame(features)
    
    # Save to database
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE COMPONENT_FEATURES CASCADE;"))
        con.commit()
    
    df_features.to_sql('component_features', engine, if_exists='append', index=False)
    print(f"Feature engineering completed. Wrote {len(df_features)} records.")

if __name__ == "__main__":
    run_feature_engineering()
