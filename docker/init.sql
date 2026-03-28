-- RBAMPS Database Schema Initialization

CREATE TABLE aircraft (
    aircraft_id SERIAL PRIMARY KEY,
    registration VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(50),
    manufacture_date DATE,
    fleet_entry_date DATE,
    total_flight_hours FLOAT DEFAULT 0.0,
    total_flight_cycles INTEGER DEFAULT 0,
    status VARCHAR(50)
);

CREATE TABLE component (
    component_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(aircraft_id),
    component_type VARCHAR(100),
    name VARCHAR(255),
    installation_date DATE,
    age_hours FLOAT DEFAULT 0.0,
    mtbf FLOAT,
    safety_impact FLOAT DEFAULT 0.0,
    operational_impact FLOAT DEFAULT 0.0,
    cost_impact FLOAT DEFAULT 0.0
);

CREATE TABLE maintenance_log (
    log_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    maintenance_date TIMESTAMP,
    type VARCHAR(50),
    description TEXT,
    outcome VARCHAR(100)
);

CREATE TABLE sensor_data (
    reading_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    sensor_type VARCHAR(50),
    timestamp TIMESTAMP,
    value FLOAT
);

CREATE TABLE flight_operations (
    flight_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(aircraft_id),
    departure VARCHAR(100),
    arrival VARCHAR(100),
    duration_hours FLOAT,
    departure_time TIMESTAMP,
    cycles_incremented INTEGER DEFAULT 1
);

CREATE TABLE risk_score (
    risk_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    failure_probability FLOAT,
    impact_score FLOAT,
    risk_score FLOAT,
    risk_level VARCHAR(20),
    computed_at TIMESTAMP
);

CREATE TABLE risk_trend (
    trend_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    risk_score FLOAT,
    timestamp DATE
);

CREATE TABLE component_features (
    feature_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    days_since_last_maintenance FLOAT,
    historical_failure_count INTEGER,
    component_age_hours FLOAT,
    sensor_mean_7d FLOAT,
    sensor_std_7d FLOAT,
    sensor_trend_slope FLOAT,
    aircraft_age_years FLOAT,
    flight_cycles_30d INTEGER,
    utilization_intensity FLOAT,
    feature_timestamp TIMESTAMP
);

CREATE TABLE maintenance_priority (
    priority_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    risk_score FLOAT,
    priority_rank INTEGER,
    recommended_action VARCHAR(255),
    created_at TIMESTAMP
);
