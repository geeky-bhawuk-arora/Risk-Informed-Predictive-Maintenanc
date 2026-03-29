from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date, Text, Index
from sqlalchemy.orm import relationship
from backend.db.database import Base

class Aircraft(Base):
    __tablename__ = "aircraft"
    aircraft_id = Column(Integer, primary_key=True, index=True)
    registration = Column(String(20), unique=True, index=True)
    type = Column(String(50)) # e.g. A320neo, B787-9
    fleet_category = Column(String(50)) # narrow-body, wide-body, etc.
    utilization_type = Column(String(20)) # HIGH, MEDIUM, LOW intensity
    manufacture_date = Column(Date)
    fleet_entry_date = Column(Date)
    total_flight_hours = Column(Float, default=0.0)
    total_flight_cycles = Column(Integer, default=0)
    status = Column(String(50))
    base_airport = Column(String(10)) # ICAO code
    climate_zone = Column(String(50)) # tropical, arid, etc.

    components = relationship("Component", back_populates="aircraft")
    flights = relationship("FlightOperations", back_populates="aircraft")

class Component(Base):
    __tablename__ = "component"
    component_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"), index=True)
    system_category = Column(String(100)) # propulsion, flight_controls, etc.
    component_type = Column(String(100)) # e.g. Turbofan, Main Gear
    name = Column(String(255))
    manufacturer = Column(String(100))
    installation_date = Column(Date)
    age_hours = Column(Float, default=0.0)
    mtbf = Column(Float)
    
    # Impact scores
    safety_score = Column(Float, default=0.0)
    operational_score = Column(Float, default=0.0)
    cost_score = Column(Float, default=0.0)

    # Degradation parameters
    weibull_shape = Column(Float, default=2.0)
    weibull_scale = Column(Float, default=10000.0)

    aircraft = relationship("Aircraft", back_populates="components")
    maintenance_logs = relationship("MaintenanceLog", back_populates="component")
    sensor_data = relationship("SensorData", back_populates="component")
    risk_snapshots = relationship("RiskSnapshot", back_populates="component")

class MaintenanceLog(Base):
    __tablename__ = "maintenance_log"
    log_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"), index=True)
    maintenance_date = Column(DateTime, index=True)
    maintenance_type = Column(String(50)) # scheduled, unscheduled, etc.
    subtype = Column(String(50)) # A-check, C-check, etc.
    description = Column(Text)
    outcome = Column(String(100)) # no-fault-found, part-replaced, etc.
    duration_hours = Column(Float)
    parts_cost = Column(Float)
    was_predictable = Column(Boolean, default=False)

    component = relationship("Component", back_populates="maintenance_logs")

class SensorData(Base):
    __tablename__ = "sensor_data"
    reading_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"), index=True)
    sensor_type = Column(String(50), index=True)
    timestamp = Column(DateTime, index=True)
    value = Column(Float)
    is_anomaly = Column(Boolean, default=False)
    is_missing = Column(Boolean, default=False)

    component = relationship("Component", back_populates="sensor_data")

class FlightOperations(Base):
    __tablename__ = "flight_operations"
    flight_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"), index=True)
    departure_airport = Column(String(10), index=True)
    arrival_airport = Column(String(10))
    duration_hours = Column(Float)
    departure_time = Column(DateTime, index=True)
    cycles_incremented = Column(Integer, default=1)
    route_type = Column(String(50)) # short-haul, etc.

    aircraft = relationship("Aircraft", back_populates="flights")

class RiskSnapshot(Base):
    __tablename__ = "risk_snapshot"
    snapshot_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"), index=True)
    snapshot_date = Column(DateTime, index=True)
    failure_probability = Column(Float)
    impact_score = Column(Float)
    risk_score = Column(Float)
    risk_level = Column(String(20), index=True) # HIGH, MEDIUM, LOW
    is_training_instance = Column(Boolean, default=False)
    failure_label = Column(Integer) # 0 or 1

    component = relationship("Component", back_populates="risk_snapshots")

# Combined index for risk trend queries
Index("ix_risk_component_date", RiskSnapshot.component_id, RiskSnapshot.snapshot_date)
