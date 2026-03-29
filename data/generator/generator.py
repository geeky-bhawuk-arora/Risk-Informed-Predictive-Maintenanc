import os
import argparse
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta, date
from sqlalchemy import create_engine, text
from faker import Faker
from scipy.stats import weibull_min
import time
import sys

fake = Faker()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

# --- MASTER CONFIGURATION ---
SCALE_TARGETS = {
    "small": {
        "num_aircraft": 50,
        "history_years": 1,
        "sensor_points_per_day": 0.5,
        "mtbf_mult": 0.2, # Force failures at small scale
        "label": "Small (10%)"
    },
    "medium": {
        "num_aircraft": 200,
        "history_years": 2,
        "sensor_points_per_day": 1.0,
        "label": "Medium (40%)"
    },
    "full": {
        "num_aircraft": 500,
        "history_years": 3,
        "sensor_points_per_day": 2.0,
        "label": "Full (100%)"
    }
}

FLEET_DIVERSITY = {
    "Narrow-body": {"pct": 0.40, "models": ["A320neo", "B737-MAX8", "A321LR"]},
    "Wide-body": {"pct": 0.20, "models": ["B787-9", "A350-900", "B777-300ER"]},
    "Regional": {"pct": 0.25, "models": ["E175", "CRJ900", "ATR72-600"]},
    "Turboprop": {"pct": 0.15, "models": ["Dash 8-Q400", "Cessna Caravon"]}
}

CLIMATE_ZONES = {
    "Tropical": {"bases": ["SIN", "BKK", "MAA"], "degrad_mult": 1.25},
    "Arid": {"bases": ["DXB", "PHX", "RUH"], "degrad_mult": 1.10},
    "Arctic": {"bases": ["OSL", "ANC", "HEL"], "degrad_mult": 1.30},
    "Temperate": {"bases": ["LHR", "FRA", "JFK"], "degrad_mult": 1.00},
    "Coastal": {"bases": ["LAX", "HKG", "SFO"], "degrad_mult": 1.15}
}

SYSTEM_CATEGORIES = {
    "Propulsion": {"safety": 1.0, "ops": 0.9, "cost": 0.8, "count": 2, "chans": ["EGT", "Vib", "Oil_P"]},
    "Flight Controls": {"safety": 1.0, "ops": 0.8, "cost": 0.6, "count": 2, "chans": ["Actuator_P", "Response_T"]},
    "Landing Gear": {"safety": 0.9, "ops": 0.7, "cost": 0.7, "count": 2, "chans": ["Brake_T", "Shock_Ext"]},
    "Hydraulics": {"safety": 0.8, "ops": 0.7, "cost": 0.5, "count": 1, "chans": ["System_P", "Flow_R"]},
    "Avionics": {"safety": 0.7, "ops": 0.9, "cost": 0.6, "count": 2, "chans": ["Voltage", "Op_Temp"]},
    "Electrical": {"safety": 0.5, "ops": 0.6, "cost": 0.4, "count": 1, "chans": ["Gen_Load", "Bus_V"]},
    "Pneumatics": {"safety": 0.5, "ops": 0.5, "cost": 0.4, "count": 1, "chans": ["Bleed_P", "Pack_T"]},
    "Fuel": {"safety": 0.7, "ops": 0.6, "cost": 0.5, "count": 1, "chans": ["Pump_P", "Flow_S"]},
    "Structural": {"safety": 0.8, "ops": 0.4, "cost": 0.9, "count": 1, "chans": ["Strain", "Fatigue_C"]},
    "Cabin": {"safety": 0.2, "ops": 0.4, "cost": 0.3, "count": 2, "chans": ["Light_I", "IFE_Latency"]}
}

# --- DATA GENERATION FUNCTIONS ---

def generate_aircraft(config):
    print(f"--- Generating Aircraft ({config['label']}) ---")
    aircraft = []
    
    # Age stratification
    # 20% New, 50% Mid, 30% Aging
    age_bins = [
        {"grp": "New", "range": (0, 3), "pct": 0.20},
        {"grp": "Mid-life", "range": (4, 12), "pct": 0.50},
        {"grp": "Aging", "range": (13, 25), "pct": 0.30}
    ]
    
    id_start = 1
    for ab in age_bins:
        count = int(config['num_aircraft'] * ab['pct'])
        for _ in range(count):
            age_yrs = random.uniform(ab['range'][0], ab['range'][1])
            m_date = date.today() - timedelta(days=int(age_yrs * 365.25))
            e_date = m_date + timedelta(days=random.randint(30, 365))
            
            # Fleet category
            cat = random.choices(list(FLEET_DIVERSITY.keys()), weights=[v['pct'] for v in FLEET_DIVERSITY.values()])[0]
            ac_model = random.choice(FLEET_DIVERSITY[cat]['models'])
            
            # Climate/Base
            zone = random.choice(list(CLIMATE_ZONES.keys()))
            base = random.choice(CLIMATE_ZONES[zone]['bases'])
            
            # Utilization
            util_type = random.choices(["High", "Medium", "Low"], weights=[0.35, 0.45, 0.20])[0]
            
            aircraft.append({
                "aircraft_id": id_start,
                "registration": f"N{random.randint(100, 999)}{fake.lexify('??').upper()}",
                "type": ac_model,
                "fleet_category": cat,
                "manufacture_date": m_date,
                "fleet_entry_date": e_date,
                "total_flight_hours": age_yrs * random.uniform(2000, 4000),
                "total_flight_cycles": age_yrs * random.randint(1000, 3000),
                "status": "ACTIVE",
                "base_airport": base,
                "climate_zone": zone,
                "utilization_type": util_type
            })
            id_start += 1
            
    df = pd.DataFrame(aircraft)
    df.drop(columns=['utilization_type'], inplace=True) # utilization used for flight generation only
    df.to_sql('aircraft', engine, if_exists='append', index=False)
    return aircraft

def generate_components(aircraft_list, config):
    print(f"--- Generating Components ({len(aircraft_list) * 16} targets) ---")
    components = []
    c_id = 1
    mfrs = ["Garrett", "Honeywell", "Collins", "Safran", "Liebherr", "UTC", "GE Aviation"]
    
    mtbf_mult = config.get("mtbf_mult", 1.0)
    for ac in aircraft_list:
        for cat_name, props in SYSTEM_CATEGORIES.items():
            for i in range(props["count"]):
                mtbf = random.uniform(8000, 30000) * mtbf_mult
                # Shape 2.0-3.0 for wearout, Scale ~MTBF
                shape = random.uniform(2.0, 3.2)
                scale = mtbf * 1.5
                
                inst_date = ac["fleet_entry_date"] + timedelta(days=random.randint(0, 500))
                if inst_date > date.today(): inst_date = date.today() - timedelta(days=10)

                components.append({
                    "component_id": c_id,
                    "aircraft_id": ac["aircraft_id"],
                    "system_category": cat_name,
                    "component_type": f"{cat_name} Unit {i+1}",
                    "name": f"{cat_name} {fake.lexify('????').upper()}",
                    "manufacturer": random.choice(mfrs),
                    "installation_date": inst_date,
                    "age_hours": random.uniform(0, 5000),
                    "mtbf": mtbf,
                    "safety_score": props["safety"],
                    "operational_score": props["ops"],
                    "cost_score": props["cost"],
                    "weibull_shape": shape,
                    "weibull_scale": scale
                })
                c_id += 1
                
        if c_id % 1000 == 0:
            pd.DataFrame(components).to_sql('component', engine, if_exists='append', index=False)
            components = []
            
    if components:
        pd.DataFrame(components).to_sql('component', engine, if_exists='append', index=False)
    return c_id - 1

def generate_flight_ops(aircraft_list, config):
    print("--- Generating Flight Operations (3 years high-fidelity) ---")
    history_days = config["history_years"] * 365
    now = datetime.now()
    
    batch = []
    f_id = 1
    for ac in aircraft_list:
        # Re-derive utilization for flight count
        age_yrs = (date.today() - ac["manufacture_date"]).days / 365.25
        # Re-using the logic from generate_aircraft (we could have stored it)
        # For simplicity, assign based on ID
        if ac["aircraft_id"] % 3 == 0: flights_per_day = random.randint(8, 12)
        elif ac["aircraft_id"] % 3 == 1: flights_per_day = random.randint(4, 7)
        else: flights_per_day = random.randint(1, 3)
        
        curr = now - timedelta(days=history_days)
        while curr < now:
            for _ in range(flights_per_day):
                duration = random.uniform(1.2, 5.0)
                batch.append({
                    "flight_id": f_id,
                    "aircraft_id": ac["aircraft_id"],
                    "departure_airport": ac["base_airport"],
                    "arrival_airport": random.choice(["LHR", "JFK", "SIN", "CDG", "DXB"]),
                    "duration_hours": duration,
                    "departure_time": curr,
                    "cycles_incremented": 1,
                    "route_type": "short-haul" if duration < 3 else "medium-haul"
                })
                f_id += 1
            curr += timedelta(days=1)
            
            if len(batch) >= 10000:
                pd.DataFrame(batch).to_sql('flight_operations', engine, if_exists='append', index=False)
                batch = []

    if batch:
        pd.DataFrame(batch).to_sql('flight_operations', engine, if_exists='append', index=False)
    return f_id - 1

def generate_sensor_data(config):
    print("--- Generating Sensor Data (Weibull degradation + Climatic Drift) ---")
    now = datetime.now()
    history_days = config["history_years"] * 365
    
    # Load metadata for profiles
    df_comp = pd.read_sql("""
        SELECT c.component_id, c.system_category, a.climate_zone, c.weibull_shape, c.weibull_scale 
        FROM component c 
        JOIN aircraft a ON c.aircraft_id = a.aircraft_id
    """, engine)
    
    batch = []
    r_id = 1
    
    for _, comp in df_comp.iterrows():
        chans = SYSTEM_CATEGORIES[comp["system_category"]]["chans"]
        degrad_mult = CLIMATE_ZONES[comp["climate_zone"]]["degrad_mult"]
        
        # 10% components fail
        is_failing = random.random() < 0.10
        failure_time = random.uniform(0.7, 0.95) * history_days if is_failing else 10.0 * history_days
        
        for chan in chans:
            base_val = random.uniform(50, 100)
            noise_lv = random.uniform(0.5, 2.0)
            
            curr = now - timedelta(days=history_days)
            day_idx = 0
            while curr < now:
                # Sensor gap check (2-5%)
                if random.random() < 0.03: # is_missing
                    batch.append({"reading_id": r_id, "component_id": comp["component_id"], "sensor_type": chan, "timestamp": curr, "value": None, "is_missing": True})
                else:
                    # Degradation logic
                    progression = day_idx / history_days
                    degradation = (day_idx / comp["weibull_scale"])**comp["weibull_shape"] if is_failing and day_idx > failure_time*0.5 else 0
                    
                    # Seasonal influence for Temps
                    seasonal = 4.0 * np.sin(2 * np.pi * curr.timetuple().tm_yday / 365) if "Temp" in chan or "EGT" in chan else 0
                    
                    # Anomaly spike (0.5% chance)
                    is_ano = random.random() < 0.005
                    spike = random.uniform(10, 30) if is_ano else 0
                    
                    val = base_val + (degradation * 100 * degrad_mult) + seasonal + spike + np.random.normal(0, noise_lv)
                    
                    batch.append({
                        "reading_id": r_id,
                        "component_id": comp["component_id"],
                        "sensor_type": chan,
                        "timestamp": curr,
                        "value": round(float(val), 2),
                        "is_anomaly": is_ano,
                        "is_missing": False
                    })
                
                r_id += 1
                curr += timedelta(hours=random.randint(24, 72) / config["sensor_points_per_day"])
                day_idx += 1
                
                if len(batch) >= 10000:
                    pd.DataFrame(batch).to_sql('sensor_data', engine, if_exists='append', index=False)
                    batch = []
                    
    if batch:
        pd.DataFrame(batch).to_sql('sensor_data', engine, if_exists='append', index=False)
    return r_id - 1

def generate_maintenance_logs(aircraft_list, config):
    print("--- Generating Maintenance Logs (Scheduled/Unscheduled) ---")
    df_comp = pd.read_sql("SELECT component_id, installation_date, mtbf FROM component", engine)
    
    batch = []
    l_id = 1
    
    for _, comp in df_comp.iterrows():
        inst_date = datetime.combine(comp["installation_date"], datetime.min.time())
        curr = inst_date
        while curr < datetime.now():
            # A-Check every ~500 hrs, roughly ~3 months
            curr += timedelta(days=random.randint(70, 110))
            if curr > datetime.now(): break
            
            # Scheduled event
            batch.append({
                "log_id": l_id, "component_id": comp["component_id"], "maintenance_date": curr,
                "maintenance_type": "scheduled", "subtype": "A-check",
                "description": "Routine phase check", "outcome": "Resolvied",
                "duration_hours": random.uniform(6, 12), "parts_cost": random.uniform(200, 800),
                "was_predictable": False
            })
            l_id += 1
            
            # 15% chance of an unscheduled event following a scheduled one (findings)
            if random.random() < 0.15:
                batch.append({
                    "log_id": l_id, "component_id": comp["component_id"], "maintenance_date": curr + timedelta(hours=4),
                    "maintenance_type": "on-condition", "subtype": "Finding",
                    "description": "Wear detected during inspection", "outcome": "Part-replaced",
                    "duration_hours": random.uniform(2, 6), "parts_cost": random.uniform(1000, 4000),
                    "was_predictable": True
                })
                l_id += 1

            if len(batch) >= 5000:
                pd.DataFrame(batch).to_sql('maintenance_log', engine, if_exists='append', index=False)
                batch = []

    if batch:
        pd.DataFrame(batch).to_sql('maintenance_log', engine, if_exists='append', index=False)
    
    # --- Inject FUTURE failures for training labels at small scale ---
    # This prevents the single-class solver error
    future_batch = []
    now = datetime.now()
    lookahead = now + timedelta(days=30)
    for _, comp in df_comp.iterrows():
        if random.random() < 0.15: # 15% failure rate in window
            fail_date = now + timedelta(days=random.randint(1, 29))
            future_batch.append({
                "log_id": l_id, "component_id": comp["component_id"], "maintenance_date": fail_date,
                "maintenance_type": "unscheduled", "subtype": "Failure",
                "description": "Predicted failure occurred", "outcome": "Repair-deferred",
                "duration_hours": random.uniform(10, 30), "parts_cost": random.uniform(5000, 15000),
                "was_predictable": True
            })
            l_id += 1
    
    if future_batch:
        pd.DataFrame(future_batch).to_sql('maintenance_log', engine, if_exists='append', index=False)

    return l_id - 1

def validate_and_report():
    print("\n" + "="*40)
    print("Final Data Validation Report")
    print("="*40)
    with engine.connect() as con:
        tables = ["aircraft", "component", "flight_operations", "sensor_data", "maintenance_log"]
        for t in tables:
            cnt = con.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"- {t:20}: {cnt:,} rows")
        
        # FK check
        orph_comp = con.execute(text("SELECT COUNT(*) FROM component WHERE aircraft_id NOT IN (SELECT aircraft_id FROM aircraft)")).scalar()
        print(f"- Orphaned components  : {orph_comp}")
        
    print("="*40 + "\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", choices=["small", "medium", "full"], default="small")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    Faker.seed(args.seed)

    config = SCALE_TARGETS[args.scale]
    start = time.time()

    print(f"RBAMPS Master Data Generator (Seed: {args.seed})")
    
    with engine.connect() as con:
        con.execute(text("TRUNCATE TABLE risk_snapshot, sensor_data, maintenance_log, flight_operations, component, aircraft CASCADE;"))
        con.commit()
    
    aircraft = generate_aircraft(config)
    num_comps = generate_components(aircraft, config)
    num_flights = generate_flight_ops(aircraft, config)
    num_sensors = generate_sensor_data(config)
    num_logs = generate_maintenance_logs(aircraft, config)

    validate_and_report()
    print(f"Generation complete in {(time.time() - start)/60:.1f} minutes.")

if __name__ == "__main__":
    main()
