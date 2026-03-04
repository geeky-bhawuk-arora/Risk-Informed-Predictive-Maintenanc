from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.database import engine, get_db, Base
from backend.db import models

app = FastAPI(title="Risk-Based Maintenance API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend API is running"}

@app.get("/aircraft")
def get_fleet(db: Session = Depends(get_db)):
    aircrafts = db.query(models.Aircraft).all()
    # Also get high risk count per aircraft
    res = []
    for ac in aircrafts:
        high_risk = db.query(models.RiskScore).filter(
            models.RiskScore.aircraft_id == ac.aircraft_id,
            models.RiskScore.risk_level == "High"
        ).count()
        res.append({
            "aircraft_id": ac.aircraft_id,
            "tail_number": ac.tail_number,
            "aircraft_model": ac.aircraft_model,
            "status": ac.status,
            "high_risk_components": high_risk
        })
    return res

@app.get("/aircraft/{id}")
def get_aircraft(id: int, db: Session = Depends(get_db)):
    ac = db.query(models.Aircraft).filter(models.Aircraft.aircraft_id == id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    comps = db.query(models.RiskScore).join(models.Component).filter(
        models.RiskScore.aircraft_id == id
    ).all()
    
    components = []
    for r in comps:
        c = db.query(models.Component).filter(models.Component.component_id == r.component_id).first()
        components.append({
            "component_id": c.component_id,
            "component_type": c.component_type,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "failure_probability": r.failure_probability
        })

    return {
        "aircraft": {
            "id": ac.aircraft_id,
            "tail": ac.tail_number,
            "model": ac.aircraft_model
        },
        "components": components
    }

@app.get("/components/{id}")
def get_component(id: int, db: Session = Depends(get_db)):
    comp = db.query(models.Component).filter(models.Component.component_id == id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
        
    risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == id).first()
    sensors = db.query(models.SensorReading).filter(models.SensorReading.component_id == id).order_by(models.SensorReading.timestamp.desc()).limit(10).all()
    
    return {
        "component_id": comp.component_id,
        "type": comp.component_type,
        "criticality": comp.criticality_class,
        "risk_profile": {
            "score": risk.risk_score if risk else None,
            "level": risk.risk_level if risk else "Unknown",
            "probability": risk.failure_probability if risk else 0.0,
            "driver": risk.dominant_driver if risk else "N/A"
        },
        "recent_sensors": [
            {"parameter": s.parameter, "value": s.value, "timestamp": s.timestamp} for s in sensors
        ]
    }

@app.get("/risk/fleet")
def get_fleet_risk(db: Session = Depends(get_db)):
    # Aggregated risk distribution
    low = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "Low").count()
    med = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "Medium").count()
    high = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "High").count()
    
    # Failure probability histogram data
    probs = [float(r[0]) for r in db.query(models.RiskScore.failure_probability).all()]
    
    
    return {
        "distribution": {
            "Low": low,
            "Medium": med,
            "High": high
        },
        "probabilities": probs
    }

@app.get("/priorities")
def get_priorities(db: Session = Depends(get_db)):
    # Join Priority, Aircraft, and Component
    results = db.query(
        models.MaintenancePriority, models.Aircraft, models.Component
    ).join(
        models.Aircraft, models.MaintenancePriority.aircraft_id == models.Aircraft.aircraft_id
    ).join(
        models.Component, models.MaintenancePriority.component_id == models.Component.component_id
    ).order_by(
        models.MaintenancePriority.priority_rank
    ).limit(100).all()
    
    priorities = []
    for p, a, c in results:
        priorities.append({
            "rank": p.priority_rank,
            "aircraft_tail": a.tail_number,
            "component_type": c.component_type,
            "component_id": c.component_id,
            "risk_score": p.risk_score,
            "action": p.recommended_action,
            "reasoning": p.reasoning
        })
    return priorities

def trigger_pipeline():
    try:
        from backend.ml.pipeline import run_pipeline
        run_pipeline()
    except Exception as e:
        print(f"Pipeline error: {e}")

@app.post("/risk/recompute")
def recompute_risk(background_tasks: BackgroundTasks):
    background_tasks.add_task(trigger_pipeline)
    return {"message": "Pipeline triggered in background. Data will update shortly."}
