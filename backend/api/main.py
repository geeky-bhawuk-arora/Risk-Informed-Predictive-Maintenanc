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
    high_risk = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "HIGH").count()
    med_risk = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "MEDIUM").count()
    low_risk = db.query(models.RiskScore).filter(models.RiskScore.risk_level == "LOW").count()
    
    # Components with action required
    maint_due = high_risk + med_risk

    return {
        "total_aircraft": total_aircraft,
        "risk_counts": {
            "HIGH": high_risk,
            "MEDIUM": med_risk,
            "LOW": low_risk
        },
        "maintenance_due_count": maint_due
    }

@app.get("/api/v1/fleet/health-score")
def get_fleet_health(db: Session = Depends(get_db)):
    scores = db.query(models.RiskScore.risk_score).all()
    if not scores:
        return {"health_score": 100}
    
    avg_risk = sum([s[0] for s in scores]) / len(scores)
    # Health score is inverse of risk, scaled to 0-100
    health = max(0, min(100, (1 - avg_risk) * 100))
    return {"health_score": round(health, 1)}

# --- Component & Risk Endpoints ---

@app.get("/api/v1/components/risk-rankings")
def get_risk_rankings(db: Session = Depends(get_db)):
    # Join Priority, Component, and Aircraft
    results = db.query(
        models.MaintenancePriority, models.Component, models.Aircraft
    ).join(models.Component, models.MaintenancePriority.component_id == models.Component.component_id)\
     .join(models.Aircraft, models.Component.aircraft_id == models.Aircraft.aircraft_id)\
     .order_by(models.MaintenancePriority.priority_rank).all()
    
    rankings = []
    for p, c, a in results:
        rankings.append({
            "rank": p.priority_rank,
            "component_id": c.component_id,
            "component_name": c.name,
            "aircraft_registration": a.registration,
            "risk_score": p.risk_score,
            "recommended_action": p.recommended_action,
            "risk_level": db.query(models.RiskScore.risk_level).filter(models.RiskScore.component_id == c.component_id).scalar()
        })
    return rankings

@app.get("/api/v1/components/risk-rankings/export")
def export_risk_rankings(db: Session = Depends(get_db)):
    rankings = get_risk_rankings(db)
    df = pd.DataFrame(rankings)
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=maintenance_priority_list.csv"
    return response

@app.get("/api/v1/components/{id}/risk")
def get_component_risk(id: int, db: Session = Depends(get_db)):
    comp = db.query(models.Component).filter(models.Component.component_id == id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
        
    risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk data not found")
        
    return {
        "component_id": comp.component_id,
        "name": comp.name,
        "type": comp.component_type,
        "failure_probability": risk.failure_probability,
        "impact_score": risk.impact_score,
        "risk_score": risk.risk_score,
        "risk_level": risk.risk_level,
        "impact_breakdown": {
            "safety": comp.safety_impact,
            "operational": comp.operational_impact,
            "cost": comp.cost_impact
        }
    }

@app.get("/api/v1/components/{id}/risk-trend")
def get_component_risk_trend(id: int, db: Session = Depends(get_db)):
    trends = db.query(models.RiskTrend).filter(models.RiskTrend.component_id == id)\
               .order_by(models.RiskTrend.timestamp.asc()).all()
    return [{"date": t.timestamp, "risk_score": t.risk_score} for t in trends]

# --- Aircraft Endpoints ---

@app.get("/api/v1/aircraft/{id}/components")
def get_aircraft_components(id: int, db: Session = Depends(get_db)):
    ac = db.query(models.Aircraft).filter(models.Aircraft.aircraft_id == id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    comps = db.query(models.Component).filter(models.Component.aircraft_id == id).all()
    res = []
    for c in comps:
        risk = db.query(models.RiskScore).filter(models.RiskScore.component_id == c.component_id).first()
        res.append({
            "component_id": c.component_id,
            "name": c.name,
            "type": c.component_type,
            "risk_score": risk.risk_score if risk else 0.0,
            "risk_level": risk.risk_level if risk else "LOW"
        })
    return {
        "aircraft": {"id": ac.aircraft_id, "registration": ac.registration, "type": ac.type},
        "components": res
    }

# --- Maintenance Schedule ---

@app.get("/api/v1/maintenance/schedule")
def get_maintenance_schedule(db: Session = Depends(get_db)):
    # Returns recommended schedule sorted by priority
    return get_risk_rankings(db)

# --- Settings & Admin ---

@app.post("/api/v1/settings/impact-weights")
def update_impact_weights(weights: Dict[str, float], db: Session = Depends(get_db)):
    s = weights.get("safety", 0.5)
    o = weights.get("operational", 0.3)
    c = weights.get("cost", 0.2)
    
    if abs((s + o + c) - 1.0) > 0.001:
        raise HTTPException(status_code=400, detail="Weights must sum to 1.0")
    
    # Recompute risk scores live
    calculate_risk(safety_w=s, operational_w=o, cost_w=c)
    
    return get_risk_rankings(db)

@app.post("/api/v1/data/regenerate")
def regenerate_data(background_tasks: BackgroundTasks):
    # This would normally call the data generator script
    # For now, we'll trigger the pipeline
    background_tasks.add_task(run_pipeline)
    return {"status": "Job started", "message": "Synthetic data regeneration and model re-run initiated."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
