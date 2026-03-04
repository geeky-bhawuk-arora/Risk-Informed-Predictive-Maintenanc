from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey
from .database import Base

class Aircraft(Base):
    __tablename__ = "aircraft"
    aircraft_id = Column(Integer, primary_key=True, index=True)
    tail_number = Column(String(20), unique=True, index=True)
    aircraft_model = Column(String(50))
    status = Column(String(50))

class Component(Base):
    __tablename__ = "component"
    component_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    component_type = Column(String(100))
    criticality_class = Column(String(20))

class RiskScore(Base):
    __tablename__ = "risk_score"
    risk_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    component_id = Column(Integer, ForeignKey("component.component_id"))
    failure_probability = Column(Float)
    impact_score = Column(Float)
    risk_score = Column(Float)
    risk_level = Column(String(20))
    dominant_driver = Column(String(50))
    computed_at = Column(DateTime)

class MaintenancePriority(Base):
    __tablename__ = "maintenance_priority"
    priority_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    component_id = Column(Integer, ForeignKey("component.component_id"))
    priority_rank = Column(Integer)
    risk_score = Column(Float)
    recommended_action = Column(String(255))
    reasoning = Column(Text)
    generated_at = Column(DateTime)

class SensorReading(Base):
    __tablename__ = "sensor_reading"
    reading_id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.aircraft_id"))
    component_id = Column(Integer, ForeignKey("component.component_id"))
    parameter = Column(String(50))
    value = Column(Float)
    unit = Column(String(20))
    timestamp = Column(DateTime)
