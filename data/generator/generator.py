import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine
import random
from faker import Faker

fake = Faker()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@localhost:5432/risk_db")
engine = create_engine(DB_URL)

NUM_AIRCRAFT = 50
COMPONENTS_PER_AIRCRAFT = 12
DAYS_HISTORY = 180

def generate_impact_scores():
    impact_data = [
        {"component_type": "Engine", "safety_impact": 1.0, "operational_impact": 1.0, "cost_impact": 1.0, "justification": "Critical flight system"},
        {"component_type": "Landing Gear", "safety_impact": 0.9, "operational_impact": 0.9, "cost_impact": 0.8, "justification": "Essential for landing"},
        {"component_type": "Avionics", "safety_impact": 0.8, "operational_impact": 0.7, "cost_impact": 0.9, "justification": "Navigation and control"},
        {"component_type": "APU", "safety_impact": 0.4, "operational_impact": 0.6, "cost_impact": 0.5, "justification": "Auxiliary power"},
        {"component_type": "Hydraulics", "safety_impact": 0.9, "operational_impact": 0.8, "cost_impact": 0.6, "justification": "Actuation systems"},
        {"component_type": "Cabin Environmental", "safety_impact": 0.3, "operational_impact": 0.5, "cost_impact": 0.3, "justification": "Passenger comfort"},
        {"component_type": "Fuel System", "safety_impact": 1.0, "operational_impact": 0.9, "cost_impact": 0.7, "justification": "Critical for sustained flight"},
        {"component_type": "Brakes", "safety_impact": 0.8, "operational_impact": 0.8, "cost_impact": 0.6, "justification": "Stopping power on ground"},
        {"component_type": "Weather Radar", "safety_impact": 0.6, "operational_impact": 0.4, "cost_impact": 0.5, "justification": "Weather avoidance"},
        {"component_type": "Cargo Doors", "safety_impact": 0.7, "operational_impact": 0.8, "cost_impact": 0.4, "justification": "Required for operation"}
    ]
    df = pd.DataFrame(impact_data)
    df.to_sql('impact_score', engine, if_exists='append', index=False)
    return [d['component_type'] for d in impact_data]

def generate_aircraft():
    models = ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A350', 'Embraer E190']
    manufacturers = ['Boeing', 'Airbus', 'Boeing', 'Airbus', 'Embraer']
    
    aircraft_data = []
    for i in range(1, NUM_AIRCRAFT + 1):
        model_idx = random.randint(0, len(models) - 1)
        eis_date = fake.date_between(start_date="-15y", end_date="-1y")
        aircraft_data.append({
            "aircraft_id": i,
            "tail_number": f"N{random.randint(100, 999)}{fake.lexify('??').upper()}",
            "aircraft_model": models[model_idx],
            "manufacturer": manufacturers[model_idx],
            "entry_into_service_date": eis_date,
            "operator": "Global Airlines",
            "status": random.choices(["Active", "In Maintenance"], weights=[0.9, 0.1])[0]
        })
    df = pd.DataFrame(aircraft_data)
    df.to_sql('aircraft', engine, if_exists='append', index=False)
    return df

def generate_components(aircraft_df, component_types):
    component_data = []
    comp_id = 1
    for _, aircraft in aircraft_df.iterrows():
        # Assign 10-15 components
        num_comps = random.randint(10, 15)
        selected_types = random.choices(component_types, k=num_comps)
        for c_type in selected_types:
            component_data.append({
                "component_id": comp_id,
                "aircraft_id": aircraft['aircraft_id'],
                "component_type": c_type,
                "ata_chapter": str(random.randint(21, 80)),
                "criticality_class": random.choice(["High", "Medium", "Low"]),
                "expected_life_hours": random.randint(10000, 50000),
                "manufacturer": fake.company()
            })
            comp_id += 1
    df = pd.DataFrame(component_data)
    df.to_sql('component', engine, if_exists='append', index=False)
    return df

def generate_flight_operations(aircraft_df):
    flight_data = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=DAYS_HISTORY)
    
    flight_id = 1
    for _, aircraft in aircraft_df.iterrows():
        current_date = start_date
        while current_date <= end_date:
            # 1-4 flights per day
            num_flights = random.randint(1, 4)
            for _ in range(num_flights):
                flight_hours = random.uniform(1.0, 12.0)
                flight_data.append({
                    "flight_id": flight_id,
                    "aircraft_id": aircraft['aircraft_id'],
                    "flight_hours": round(flight_hours, 2),
                    "flight_cycles": 1,
                    "departure": fake.lexify('???').upper(),
                    "arrival": fake.lexify('???').upper(),
                    "delay_minutes": int(np.random.exponential(15)),
                    "flight_date": current_date.date()
                })
                flight_id += 1
            current_date += timedelta(days=1)
            
    df = pd.DataFrame(flight_data)
    df.to_sql('flight_operation', engine, if_exists='append', index=False)
    return df

def generate_sensor_readings(components_df):
    readings = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=DAYS_HISTORY)
    
    reading_id = 1
    for _, component in components_df.iterrows():
        # Generate periodic readings (e.g. daily)
        current_date = start_date
        
        # Introduce a degradation trend for some components
        has_trend = random.random() < 0.2
        trend_factor = random.uniform(0.01, 0.05) if has_trend else 0
        
        day_count = 0
        while current_date <= end_date:
            temp_base = 80 + day_count * trend_factor * 20
            vib_base = 0.5 + day_count * trend_factor * 0.1
            
            readings.append({
                "reading_id": reading_id,
                "aircraft_id": component['aircraft_id'],
                "component_id": component['component_id'],
                "parameter": "temperature",
                "value": round(random.gauss(temp_base, 5), 2),
                "unit": "Celsius",
                "timestamp": current_date
            })
            reading_id += 1
            readings.append({
                "reading_id": reading_id,
                "aircraft_id": component['aircraft_id'],
                "component_id": component['component_id'],
                "parameter": "vibration",
                "value": round(random.gauss(vib_base, 0.1), 3),
                "unit": "g",
                "timestamp": current_date
            })
            reading_id += 1
            current_date += timedelta(days=random.randint(1, 3)) # Reading every 1-3 days
            day_count += 3
            
    # Chunking insert for large data
    df = pd.DataFrame(readings)
    df.to_sql('sensor_reading', engine, if_exists='append', index=False, chunksize=10000)

def generate_maintenance_logs(components_df):
    logs = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=DAYS_HISTORY)
    
    event_id = 1
    for _, component in components_df.iterrows():
        # Random number of maintenance events in the history
        num_events = random.randint(0, 5)
        for _ in range(num_events):
            event_date = start_date + timedelta(days=random.randint(0, DAYS_HISTORY))
            is_unscheduled = random.random() < 0.2
            logs.append({
                "maintenance_event_id": event_id,
                "aircraft_id": component['aircraft_id'],
                "component_id": component['component_id'],
                "event_type": "Repair" if is_unscheduled else "Inspection",
                "failure_mode": random.choice(["Wear and Tear", "Overheating", "Vibration", "Corrosion"]) if is_unscheduled else None,
                "action_taken": "Replaced part" if is_unscheduled else "Lubricated and checked",
                "unscheduled": is_unscheduled,
                "event_timestamp": event_date
            })
            event_id += 1
            
    df = pd.DataFrame(logs)
    df.to_sql('maintenance_log', engine, if_exists='append', index=False)

def main():
    print("Clearing existing data...")
    with engine.connect() as con:
        con.execute(pd.io.sql.text("TRUNCATE TABLE maintenance_priority CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE risk_score CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE failure_probability CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE component_features CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE flight_operation CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE sensor_reading CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE maintenance_log CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE component CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE aircraft CASCADE;"))
        con.execute(pd.io.sql.text("TRUNCATE TABLE impact_score CASCADE;"))
        con.commit()

    print("Generating impact scores...")
    component_types = generate_impact_scores()
    
    print("Generating aircraft...")
    aircraft_df = generate_aircraft()
    
    print("Generating components...")
    components_df = generate_components(aircraft_df, component_types)
    
    print("Generating flight operations...")
    generate_flight_operations(aircraft_df)
    
    print("Generating sensor readings... (This may take a moment)")
    generate_sensor_readings(components_df)
    
    print("Generating maintenance logs...")
    generate_maintenance_logs(components_df)
    
    print("Synthetic data generation complete!")

if __name__ == "__main__":
    main()
