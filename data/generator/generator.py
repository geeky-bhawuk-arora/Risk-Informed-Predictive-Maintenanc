import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from sqlalchemy import create_engine, text
import random
from faker import Faker

fake = Faker()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

# Constants
NUM_AIRCRAFT = 20
COMPONENTS_PER_AIRCRAFT = 10
HISTORY_DAYS = 365
LOOKAHEAD_DAYS = 30 # For ground truth labeling
NOW = datetime.now()

def generate_data():
    print("Clearing existing data...")
    with engine.connect() as con:
        tables = [
            "maintenance_priority", "risk_trend", "risk_score", 
            "component_features", "sensor_data", "maintenance_log", 
            "flight_operations", "component", "aircraft"
        ]
        for table in tables:
            con.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
        con.commit()

    print(f"Generating {NUM_AIRCRAFT} aircraft...")
    aircraft_list = []
    types = ["Boeing 737", "Airbus A320", "Boeing 787", "Airbus A350"]
    for i in range(1, NUM_AIRCRAFT + 1):
        m_date = fake.date_between(start_date="-15y", end_date="-2y")
        e_date = m_date + timedelta(days=random.randint(30, 180))
        aircraft_list.append({
            "aircraft_id": i,
            "registration": f"N{random.randint(100, 999)}{fake.lexify('??').upper()}",
            "type": random.choice(types),
            "manufacture_date": m_date,
            "fleet_entry_date": e_date,
            "total_flight_hours": random.uniform(5000, 40000),
            "total_flight_cycles": random.randint(2000, 15000),
            "status": "ACTIVE"
        })
    df_ac = pd.DataFrame(aircraft_list)
    df_ac.to_sql('aircraft', engine, if_exists='append', index=False)

    print("Generating components...")
    comp_types = [
        ("Engine", "Turbofan"), ("Landing Gear", "Main Gear"), ("Avionics", "FMS"),
        ("Hydraulics", "Pump"), ("APU", "GTCP131"), ("Brakes", "Carbon Brake"),
        ("Fuel System", "Boost Pump"), ("Environmental", "Pack"),
        ("Flight Controls", "Actuator"), ("Weather Radar", "RTA-4")
    ]
    
    component_list = []
    c_id = 1
    for ac in aircraft_list:
        for c_type, c_name in comp_types:
            inst_date = ac['fleet_entry_date'] + timedelta(days=random.randint(0, 365))
            component_list.append({
                "component_id": c_id,
                "aircraft_id": ac['aircraft_id'],
                "component_type": c_type,
                "name": f"{c_name} {fake.lexify('????').upper()}",
                "installation_date": inst_date,
                "age_hours": random.uniform(100, 10000),
                "mtbf": random.uniform(5000, 20000),
                "safety_impact": random.uniform(0.1, 1.0),
                "operational_impact": random.uniform(0.1, 1.0),
                "cost_impact": random.uniform(0.1, 1.0)
            })
            c_id += 1
    df_comp = pd.DataFrame(component_list)
    df_comp.to_sql('component', engine, if_exists='append', index=False)

    print("Generating flight operations (1 year history)...")
    flights = []
    f_id = 1
    for ac in aircraft_list:
        curr = NOW - timedelta(days=HISTORY_DAYS)
        while curr <= NOW:
            if random.random() < 0.8: # 80% chance of flight per day
                duration = random.uniform(1.0, 10.0)
                flights.append({
                    "flight_id": f_id,
                    "aircraft_id": ac['aircraft_id'],
                    "departure": fake.city(),
                    "arrival": fake.city(),
                    "duration_hours": duration,
                    "departure_time": curr,
                    "cycles_incremented": 1
                })
                f_id += 1
            curr += timedelta(days=1)
    pd.DataFrame(flights).to_sql('flight_operations', engine, if_exists='append', index=False)

    print("Generating maintenance logs (History + Future Labels)...")
    logs = []
    l_id = 1
    for comp in component_list:
        # Generate 0-3 historical unscheduled events
        num_hist = random.randint(0, 3)
        for _ in range(num_hist):
            m_date = NOW - timedelta(days=random.randint(1, HISTORY_DAYS))
            logs.append({
                "log_id": l_id,
                "component_id": comp['component_id'],
                "maintenance_date": m_date,
                "type": "unscheduled",
                "description": "Repaired component due to failure",
                "outcome": "Resolved"
            })
            l_id += 1
        
        # Artificial "Future" failure for ground truth (20% chance)
        if random.random() < 0.2:
            m_date = NOW + timedelta(days=random.randint(1, LOOKAHEAD_DAYS))
            logs.append({
                "log_id": l_id,
                "component_id": comp['component_id'],
                "maintenance_date": m_date,
                "type": "unscheduled",
                "description": "Predicted failure occurred",
                "outcome": "Pending"
            })
            l_id += 1
    pd.DataFrame(logs).to_sql('maintenance_log', engine, if_exists='append', index=False)

    print("Generating sensor data (last 30 days)...")
    sensors = []
    r_id = 1
    for comp in component_list:
        # Some components have a degrading trend
        has_trend = random.random() < 0.3
        slope = random.uniform(0.1, 0.5) if has_trend else random.uniform(-0.02, 0.02)
        base_val = random.uniform(50, 100)
        
        curr = NOW - timedelta(days=30)
        while curr <= NOW:
            val = base_val + (slope * (curr - (NOW - timedelta(days=30))).days) + random.gauss(0, 2)
            sensors.append({
                "reading_id": r_id,
                "component_id": comp['component_id'],
                "sensor_type": "Health_Index",
                "timestamp": curr,
                "value": round(val, 2)
            })
            r_id += 1
            curr += timedelta(days=random.randint(1, 3))
    
    # Batch insert sensors
    df_sensors = pd.DataFrame(sensors)
    df_sensors.to_sql('sensor_data', engine, if_exists='append', index=False, chunksize=1000)

    print("Data generation complete.")

if __name__ == "__main__":
    generate_data()
