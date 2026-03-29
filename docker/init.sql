-- RBAMPS Database Schema Initialization (v3 - Master Specification Alignment)

CREATE TABLE aircraft (
    aircraft_id SERIAL PRIMARY KEY,
    registration VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(50), -- e.g. A320neo, B787-9
    fleet_category VARCHAR(50), -- narrow-body, wide-body, etc.
    utilization_type VARCHAR(20), -- HIGH, MEDIUM, LOW intensity
    manufacture_date DATE,
    fleet_entry_date DATE,
    total_flight_hours FLOAT DEFAULT 0.0,
    total_flight_cycles INTEGER DEFAULT 0,
    status VARCHAR(50),
    base_airport VARCHAR(10), -- ICAO code
    climate_zone VARCHAR(50)  -- tropical, arid, etc.
);

CREATE TABLE component (
    component_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(aircraft_id),
    system_category VARCHAR(100), -- propulsion, flight_controls, etc.
    component_type VARCHAR(100),   -- e.g. Turbofan, Main Gear
    name VARCHAR(255),
    manufacturer VARCHAR(100),
    installation_date DATE,
    age_hours FLOAT DEFAULT 0.0,
    mtbf FLOAT,
    safety_score FLOAT DEFAULT 0.0,
    operational_score FLOAT DEFAULT 0.0,
    cost_score FLOAT DEFAULT 0.0,
    weibull_shape FLOAT DEFAULT 2.0,
    weibull_scale FLOAT DEFAULT 10000.0
);

CREATE TABLE maintenance_log (
    log_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    maintenance_date TIMESTAMP,
    maintenance_type VARCHAR(50), -- scheduled, unscheduled, etc.
    subtype VARCHAR(50), -- A-check, C-check, etc.
    description TEXT,
    outcome VARCHAR(100), -- no-fault-found, part-replaced, etc.
    duration_hours FLOAT,
    parts_cost FLOAT,
    was_predictable BOOLEAN DEFAULT FALSE
);

CREATE TABLE sensor_data (
    reading_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    sensor_type VARCHAR(50), -- EGT, Vibration, etc.
    timestamp TIMESTAMP,
    value FLOAT,
    is_anomaly BOOLEAN DEFAULT FALSE,
    is_missing BOOLEAN DEFAULT FALSE
);

CREATE TABLE flight_operations (
    flight_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircraft(aircraft_id),
    departure_airport VARCHAR(10),
    arrival_airport VARCHAR(10),
    duration_hours FLOAT,
    departure_time TIMESTAMP,
    cycles_incremented INTEGER DEFAULT 1,
    route_type VARCHAR(50) -- short-haul, etc.
);

CREATE TABLE risk_snapshot (
    snapshot_id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES component(component_id),
    snapshot_date TIMESTAMP,
    failure_probability FLOAT,
    impact_score FLOAT,
    risk_score FLOAT,
    risk_level VARCHAR(20), -- HIGH, MEDIUM, LOW
    is_training_instance BOOLEAN DEFAULT FALSE,
    failure_label INTEGER -- 0 or 1
);

CREATE TABLE risk_config (
    config_id SERIAL PRIMARY KEY,
    safety_weight FLOAT DEFAULT 0.5,
    operational_weight FLOAT DEFAULT 0.3,
    cost_weight FLOAT DEFAULT 0.2,
    updated_at TIMESTAMP
);

-- Strategic Indices for Performance at Scale (2M+ readings)
CREATE INDEX idx_sensor_component_time ON sensor_data(component_id, timestamp);
CREATE INDEX idx_risk_component_date ON risk_snapshot(component_id, snapshot_date);
CREATE INDEX idx_log_component_date ON maintenance_log(component_id, maintenance_date);
CREATE INDEX idx_flight_aircraft_time ON flight_operations(aircraft_id, departure_time);
CREATE INDEX idx_aircraft_registration ON aircraft(registration);
CREATE INDEX idx_risk_level ON risk_snapshot(risk_level);
