from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Aircraft(Base):
    __tablename__ = "aircraft"
    aircraft_id = Column(Integer, primary_key=True, index=True)
    registration = Column(String(20), unique=True, index=True)
    type = Column(String(50))
    manufacture_date = Column(Date)
    fleet_entry_date = Column(Date)
    total_flight_hours = Column(Float, default=0.0)
    total_flight_cycles = Column(Integer, default=0)
    status = Column(String(50))

    components = relationship("Component", back_populates="aircraft")
    flights = relationship("FlightOperations", back_populates="aircraft")

class Component(Base):
    __tablename__ = "component"
    component_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    component_type = Column(String(100))
    name = Column(String(255))
    installation_date = Column(Date)
    age_hours = Column(Float, default=0.0)
    mtbf = Column(Float)
    
    # Impact sub-scores
    safety_impact = Column(Float, default=0.0)
    operational_impact = Column(Float, default=0.0)
    cost_impact = Column(Float, default=0.0)

    aircraft = relationship("Aircraft", back_populates="components")
    maintenance_logs = relationship("MaintenanceLog", back_populates="component")
    sensor_data = relationship("SensorData", back_populates="component")

class MaintenanceLog(Base):
    __tablename__ = "maintenance_log"
    log_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"))
    maintenance_date = Column(DateTime)
    type = Column(String(50)) # scheduled, unscheduled, inspection
    description = Column(Text)
    outcome = Column(String(100))

    component = relationship("Component", back_populates="maintenance_logs")

class SensorData(Base):
    __tablename__ = "sensor_data"
    reading_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"))
    sensor_type = Column(String(50))
    timestamp = Column(DateTime)
    value = Column(Float)

    component = relationship("Component", back_populates="sensor_data")

class FlightOperations(Base):
    __tablename__ = "flight_operations"
    flight_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    departure = Column(String(100))
    arrival = Column(String(100))
    duration_hours = Column(Float)
    departure_time = Column(DateTime)
    cycles_incremented = Column(Integer, default=1)

    aircraft = relationship("Aircraft", back_populates="flights")

class RiskScore(Base):
    __tablename__ = "risk_score"
    risk_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"))
    failure_probability = Column(Float)
    impact_score = Column(Float)
    risk_score = Column(Float)
    risk_level = Column(String(20)) # HIGH, MEDIUM, LOW
    computed_at = Column(DateTime)

class RiskTrend(Base):
    __tablename__ = "risk_trend"
    trend_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"))
    risk_score = Column(Float)
    timestamp = Column(Date) # Storing daily risk scores

class ComponentFeatures(Base):
    __tablename__ = "component_features"
    feature_id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("component.component_id"))
    days_since_last_maintenance = Column(Float)
    historical_failure_count = Column(Integer)
    component_age_hours = Column(Float)
    sensor_mean_7d = Column(Float)
    sensor_std_7d = Column(Float)
    sensor_trend_slope = Column(Float)
    aircraft_age_years = Column(Float)
    flight_cycles_30d = Column(Integer)
    utilization_intensity = Column(Float)
    feature_timestamp = Column(DateTime)
