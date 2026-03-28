from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import pandas as pd
import io
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.database import engine, get_db, Base
from backend.db import models
from backend.ml.pipeline import run_pipeline
from backend.risk_engine.risk_engine import calculate_risk

app = FastAPI(title="RBAMPS API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Fleet Endpoints ---

@app.get("/api/v1/fleet/overview")
def get_fleet_overview(db: Session = Depends(get_db)):
    total_aircraft = db.query(models.Aircraft).count()
    if total_aircraft == 0:
        return {"total_aircraft": 0, "avg_health": 0, "critical_count": 0, "maintenance_due": 0, "risk_trend": [], "aircraft_status": []}

    avg_risk = db.query(func.avg(models.RiskScore.risk_score)).scalar() or 0
    critical_count = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "HIGH").count()
    med_risk = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "MEDIUM").count()
    
    # Mock risk trend for the last 7 days
    risk_trend = []
    base_date = datetime.now()
    for i in range(7):
        date = (base_date - timedelta(days=6-i)).strftime("%Y-%m-%d")
        risk_trend.append({"date": date, "risk": round(random.uniform(0.1, 0.4), 2)})

    # Top aircraft status
    aircraft_list = db.query(models.Aircraft).limit(10).all()
    aircraft_status = []
    for ac in aircraft_list:
        max_risk = db.query(func.max(models.RiskScore.risk_score)).join(models.Component).filter(models.Component.aircraft_id == ac.aircraft_id).scalar() or 0
        aircraft_status.append({
            "id": ac.aircraft_id,
            "registration": ac.registration,
            "type": ac.type,
            "health": round(1 - max_risk, 2)
        })

    return {
        "total_aircraft": total_aircraft,
        "avg_health": round(1 - avg_risk, 2),
        "critical_count": critical_count,
        "maintenance_due": critical_count + med_risk,
        "risk_trend": risk_trend,
        "aircraft_status": aircraft_status
    }

@app.get("/api/v1/fleet/aircraft/{id}")
def get_aircraft_detail(id: int, db: Session = Depends(get_db)):
    ac = db.query(models.Aircraft).filter(models.Aircraft.aircraft_id == id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    comps = db.query(models.Component).filter(models.Component.aircraft_id == id).all()
    component_list = []
    max_risk = 0
    for c in comps:
        risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == c.component_id).first()
        r_score = risk.risk_score if risk else 0.0
        max_risk = max(max_risk, r_score)
        component_list.append({
            "id": c.component_id,
            "name": c.name,
            "type": c.component_type,
            "serial_number": c.serial_number,
            "failure_probability": risk.failure_probability if risk else 0.0,
            "risk_score": r_score,
            "risk_level": risk.risk_level if risk else "LOW"
        })

    return {
        "registration": ac.registration,
        "type": ac.type,
        "status": "In Service",
        "health": round(1 - max_risk, 2),
        "total_hours": 12450, # Mocked
        "components": component_list
    }

# --- Component Endpoints ---

@app.get("/api/v1/components/risk-rankings")
def get_risk_rankings(db: Session = Depends(get_db)):
    results = db.query(
        models.MaintenancePriority, models.Component, models.Aircraft
    ).join(models.Component, models.MaintenancePriority.component_id == models.Component.component_id)\
     .join(models.Aircraft, models.Component.aircraft_id == models.Aircraft.aircraft_id)\
     .order_by(models.MaintenancePriority.priority_rank).limit(50).all()
    
    rankings = []
    for p, c, a in results:
        risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == c.component_id).first()
        rankings.append({
            "component_id": c.component_id,
            "component_name": c.name,
            "component_type": c.component_type,
            "aircraft_registration": a.registration,
            "risk_score": p.risk_score,
            "failure_probability": risk.failure_probability if risk else 0.0,
            "priority_rank": p.priority_rank
        })
    return rankings

@app.get("/api/v1/components/risk-rankings/export")
def export_risk_rankings(db: Session = Depends(get_db)):
    rankings = get_risk_rankings(db)
    df = pd.DataFrame(rankings)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=maintenance_priority_{datetime.now().strftime('%Y%m%d')}.csv"
    return response

@app.get("/api/v1/components/{id}/detail")
def get_component_detail(id: int, db: Session = Depends(get_db)):
    comp = db.query(models.Component).filter(models.Component.component_id == id).first()
    if not comp: raise HTTPException(status_code=404, detail="Component not found")
    
    risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == id).first()
    ac = db.query(models.Aircraft).filter(models.Aircraft.aircraft_id == comp.aircraft_id).first()
    
    # Mock telemetry for visualization
    telemetry = [{"timestamp": (datetime.now() - timedelta(hours=24-i)).isoformat(), "value": round(random.uniform(70, 95), 1)} for i in range(24)]
    
    # Mock maintenance logs
    logs = [
        {"action_taken": "Routine Inspection", "timestamp": "2024-03-01", "notes": "No anomalies found. Component within tolerance."},
        {"action_taken": "Sensor Calibration", "timestamp": "2023-11-15", "notes": "Vibration sensor recalibrated after slight drift detected."}
    ]

    return {
        "name": comp.name,
        "serial_number": comp.serial_number,
        "aircraft_registration": ac.registration if ac else "N/A",
        "risk_score": risk.risk_score if risk else 0.0,
        "failure_probability": risk.failure_probability if risk else 0.0,
        "impact_score": risk.impact_score if risk else 0.0,
        "safety_impact": comp.safety_impact,
        "operational_impact": comp.operational_impact,
        "cost_impact": comp.cost_impact,
        "telemetry": telemetry,
        "maintenance_logs": logs
    }

# --- Admin & Stats ---

@app.get("/api/v1/admin/model-stats")
def get_model_stats():
    # Mock model performance stats
    loss_curve = [{"epoch": i, "loss": round(0.5 / (i + 1) + 0.05, 4)} for i in range(20)]
    return {
        "precision": 0.942,
        "recall": 0.885,
        "auc": 0.967,
        "training_date": "2024-05-20 10:15",
        "loss_curve": loss_curve
    }

@app.post("/api/v1/data/regenerate")
def regenerate_data(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pipeline)
    return {"status": "Job started", "message": "Synthetic data regeneration and model re-run initiated."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
