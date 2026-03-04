CREATE TABLE AIRCRAFT (
    aircraft_id SERIAL PRIMARY KEY,
    tail_number VARCHAR(20) UNIQUE NOT NULL,
    aircraft_model VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    entry_into_service_date DATE,
    operator VARCHAR(100),
    status VARCHAR(50)
);

CREATE TABLE COMPONENT (
    component_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_type VARCHAR(100) NOT NULL,
    ata_chapter VARCHAR(10),
    criticality_class VARCHAR(20),
    expected_life_hours INTEGER,
    manufacturer VARCHAR(100)
);

CREATE TABLE MAINTENANCE_LOG (
    maintenance_event_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_id INTEGER REFERENCES COMPONENT(component_id),
    event_type VARCHAR(50),
    failure_mode VARCHAR(100),
    action_taken VARCHAR(255),
    unscheduled BOOLEAN,
    event_timestamp TIMESTAMP
);

CREATE TABLE SENSOR_READING (
    reading_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_id INTEGER REFERENCES COMPONENT(component_id),
    parameter VARCHAR(50),
    value FLOAT,
    unit VARCHAR(20),
    timestamp TIMESTAMP
);

CREATE TABLE FLIGHT_OPERATION (
    flight_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    flight_hours FLOAT,
    flight_cycles INTEGER,
    departure VARCHAR(10),
    arrival VARCHAR(10),
    delay_minutes INTEGER,
    flight_date DATE
);

CREATE TABLE COMPONENT_FEATURES (
    component_id INTEGER PRIMARY KEY REFERENCES COMPONENT(component_id),
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    time_since_last_maint FLOAT,
    failure_count_90d INTEGER,
    avg_temp_30d FLOAT,
    vibration_trend FLOAT,
    usage_intensity FLOAT,
    aircraft_age FLOAT,
    component_criticality VARCHAR(20),
    feature_timestamp TIMESTAMP
);

CREATE TABLE FAILURE_PROBABILITY (
    prediction_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_id INTEGER REFERENCES COMPONENT(component_id),
    prediction_horizon INTEGER,
    failure_probability FLOAT,
    model_version VARCHAR(50),
    prediction_timestamp TIMESTAMP
);

CREATE TABLE IMPACT_SCORE (
    component_type VARCHAR(100) PRIMARY KEY,
    safety_impact FLOAT,
    operational_impact FLOAT,
    cost_impact FLOAT,
    justification TEXT
);

CREATE TABLE RISK_SCORE (
    risk_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_id INTEGER REFERENCES COMPONENT(component_id),
    failure_probability FLOAT,
    impact_score FLOAT,
    risk_score FLOAT,
    risk_level VARCHAR(20),
    dominant_driver VARCHAR(50),
    computed_at TIMESTAMP
);

CREATE TABLE MAINTENANCE_PRIORITY (
    priority_id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES AIRCRAFT(aircraft_id),
    component_id INTEGER REFERENCES COMPONENT(component_id),
    priority_rank INTEGER,
    risk_score FLOAT,
    recommended_action VARCHAR(255),
    reasoning TEXT,
    generated_at TIMESTAMP
);
