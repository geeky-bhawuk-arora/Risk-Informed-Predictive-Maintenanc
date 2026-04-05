import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from scipy.stats import linregress
from datetime import datetime, timedelta

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

def run_feature_engineering():
    print("--- Starting Complex Feature Engineering (Alignment v3) ---")
    
    # 1. Load Data
    df_comps = pd.read_sql("SELECT * FROM component", engine)
    df_aircraft = pd.read_sql("SELECT * FROM aircraft", engine)
    df_maint = pd.read_sql("SELECT * FROM maintenance_log", engine)
    df_sensors = pd.read_sql("SELECT * FROM sensor_data WHERE timestamp >= NOW() - INTERVAL '60 days'", engine)
    df_flights = pd.read_sql("SELECT * FROM flight_operations WHERE departure_time >= NOW() - INTERVAL '30 days'", engine)
    
    # --- DATA CLEANING (Hardening for "Messy" Data) ---
    print(f"   - Cleaning raw telemetry ({len(df_sensors)} records)...")
    
    # 1. Deduplication
    df_sensors = df_sensors.drop_duplicates(subset=['component_id', 'timestamp', 'sensor_type'])
    
    # 2. Outlier Clipping (1st to 99th percentile) - Prevents extreme spikes from ruining slopes
    s_min, s_max = df_sensors['value'].quantile([0.01, 0.99])
    df_sensors['value'] = df_sensors['value'].clip(lower=s_min, upper=s_max)
    
    # 3. Handle Zero/Invalid values (e.g. negative EGT values are physically impossible)
    df_sensors.loc[df_sensors['value'] <= 0, 'value'] = np.nan
    
    now = datetime.now()
    features_list = []
    
    # Pre-encode static lookups
    climate_dummies = pd.get_dummies(df_aircraft['climate_zone'], prefix='climate')
    system_dummies = pd.get_dummies(df_comps['system_category'], prefix='system')
    
    for _, comp in df_comps.iterrows():
        c_id = comp['component_id']
        ac_id = comp['aircraft_id']
        ac = df_aircraft[df_aircraft['aircraft_id'] == ac_id].iloc[0]
        
        # Filtering for speed
        c_maint = df_maint[df_maint['component_id'] == c_id].copy()
        c_sensors = df_sensors[df_sensors['component_id'] == c_id].copy()
        ac_flights = df_flights[df_flights['aircraft_id'] == ac_id].copy()
        
        # 4. Imputation: Fill small gaps with interpolation for more accurate trend analysis
        if not c_sensors.empty:
            c_sensors = c_sensors.sort_values('timestamp')
            c_sensors['value'] = c_sensors['value'].interpolate(method='linear').fillna(method='bfill').fillna(method='ffill')

        # Base Features
        # 1. days_since_last_maintenance
        if not c_maint.empty:
            last_maint = pd.to_datetime(c_maint['maintenance_date']).max()
            days_since_maint = (now - last_maint.to_pydatetime()).days
            last_type = c_maint.loc[c_maint['maintenance_date'].idxmax(), 'maintenance_type']
            was_last_predictable = c_maint.loc[c_maint['maintenance_date'].idxmax(), 'was_predictable']
        else:
            days_since_maint = (now - pd.to_datetime(comp['installation_date']).to_pydatetime()).days
            last_type = "None"
            was_last_predictable = False
            
        # 2. historical_failure_count (12m)
        past_12m = now - timedelta(days=365)
        failures_12m = c_maint[
            (c_maint['maintenance_type'].str.lower() == 'unscheduled') & 
            (pd.to_datetime(c_maint['maintenance_date']) >= past_12m)
        ].shape[0]
        
        # 3. component_age_hours
        age_hours = comp['age_hours']
        mtbf_ratio = age_hours / comp['mtbf'] if comp['mtbf'] > 0 else 0
        
        # Sensor aggregates (7d and 30d)
        past_7d = now - timedelta(days=7)
        past_30d = now - timedelta(days=30)
        
        s_7d = c_sensors[pd.to_datetime(c_sensors['timestamp']) >= past_7d]
        s_30d = c_sensors[pd.to_datetime(c_sensors['timestamp']) >= past_30d]
        
        # 4 & 5. sensor_mean_7d, sensor_std_7d
        if not s_7d.empty:
            s_mean = s_7d['value'].mean()
            s_std = s_7d['value'].std()
            miss_rate_7d = s_7d['is_missing'].fillna(False).mean()
        else:
            s_mean, s_std, miss_rate_7d = 0.0, 0.0, 0.0
            
        # 6. sensor_trend_slope (30d)
        if len(s_30d) >= 5:
            # Drop missing values for slope
            s_30d_cl = s_30d.dropna(subset=['value'])
            if len(s_30d_cl) >= 5:
                # Convert timestsamp to ordinal for regression
                x = pd.to_datetime(s_30d_cl['timestamp']).apply(lambda t: t.to_pydatetime().toordinal()).values
                y = s_30d_cl['value'].values
                slope, _, _, _, _ = linregress(x, y)
            else: slope = 0.0
        else: slope = 0.0
        
        # 10. anomaly_count_30d
        ano_count_30d = s_30d['is_anomaly'].fillna(False).sum()
        
        # 7. aircraft_age_years
        ac_age = (now - pd.to_datetime(ac['manufacture_date']).to_pydatetime()).days / 365.25
        
        # 8 & 9. Flights / Utilization
        cycles_30d = ac_flights['cycles_incremented'].sum()
        util = ac_flights['duration_hours'].sum() / (30 * 12.0) # Utilization vs 12h peak
        
        # --- LABEL GENERATION (Lookahead 30 days) ---
        # The data generator creates records in the FUTURE relative to NOW in generator.py
        # But for training instances, we snapshot at 'now' and check if failure happened in next 30 days.
        lookahead = now + timedelta(days=30)
        future_fail = c_maint[
            (c_maint['maintenance_type'].str.lower() == 'unscheduled') &
            (pd.to_datetime(c_maint['maintenance_date']) > now) & 
            (pd.to_datetime(c_maint['maintenance_date']) <= lookahead)
        ]
        label = 1 if not future_fail.empty else 0
        
        # Compile record
        rec = {
            "component_id": c_id,
            "days_since_last_maintenance": float(days_since_maint),
            "historical_failure_count": int(failures_12m),
            "component_age_hours": float(age_hours),
            "sensor_mean_7d": float(s_mean),
            "sensor_std_7d": float(s_std),
            "sensor_trend_slope": float(slope),
            "aircraft_age_years": float(ac_age),
            "flight_cycles_30d": int(cycles_30d),
            "utilization_intensity": float(util),
            "anomaly_count_30d": int(ano_count_30d),
            "missing_data_rate_7d": float(miss_rate_7d),
            "was_last_maintenance_predictable": bool(was_last_predictable),
            "mtbf_ratio": float(mtbf_ratio),
            "label": int(label),
            "snapshot_date": now,
            "aircraft_id_group": ac_id # For GroupKFold
        }
        
        # Add One-Hot Encodings manually or via concat? concat is better.
        # climate_ Tropical, system_ Propulsion, etc.
        # But we'll do that at the DataFrame level for efficiency.
        features_list.append(rec)
        
    df_final = pd.DataFrame(features_list)
    df_final = df_final.fillna(0) # Ensure no NaNs from std() or linregress
    
    # Save to dynamic table (component_features) for ML model training consumption
    # We'll save the raw features + label. Categorical encoding will happen in ML model script.
    # But for demonstration, let's also save the climate_zone and system_category in df_final
    # after merging from comps/ac metadata.
    df_meta_ac = df_aircraft[['aircraft_id', 'climate_zone']]
    df_meta_comp = df_comps[['component_id', 'system_category']]
    
    df_final = df_final.merge(df_meta_ac, left_on='aircraft_id_group', right_on='aircraft_id')
    df_final = df_final.merge(df_meta_comp, on='component_id')
    
    # if_exists='replace' drops and recreates correctly
    df_final.to_sql('component_features', engine, if_exists='replace', index=False)
    print(f"Feature engineering complete. Prepared {len(df_final)} instances with {label_ratio(df_final)} positive labels.")

def label_ratio(df):
    pos = df['label'].sum()
    total = len(df)
    return f"{pos}/{total} ({pos/total:.2%})"

if __name__ == "__main__":
    run_feature_engineering()
