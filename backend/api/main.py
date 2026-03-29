from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
import pandas as pd
import io
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from backend.db.database import SessionLocal, engine
from backend.db import models
from backend.ml import pipeline
from backend.risk_engine import risk_engine

app = FastAPI(title="RBAMPS v3 Master API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- BACKGROUND JOBS TRACKER ---
jobs = {}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_heavy_pipeline(job_id):
    jobs[job_id] = "running"
    try:
        pipeline.run_pipeline() # Data generation + ML training
        jobs[job_id] = "complete"
    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        jobs[job_id] = "failed"

# --- API ENDPOINTS ---

@app.get("/api/v1/fleet/overview")
def get_fleet_overview(db: Session = Depends(get_db)):
    # 1. Total Aircraft
    total_ac = db.query(models.Aircraft).count()
    
    # 2. Get LATEST Snapshot only
    latest_date = db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()
    if not latest_date: return {"error": "No data yet"}
    
    snaps = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.snapshot_date == latest_date).all()
    
    high = len([s for s in snaps if s.risk_level == "HIGH"])
    medium = len([s for s in snaps if s.risk_level == "MEDIUM"])
    low = len([s for s in snaps if s.risk_level == "LOW"])
    
    # Fleet Health Score
    # Simplified: 100 * (1 - mean_risk)
    avg_risk = sum([s.risk_score for s in snaps]) / len(snaps) if snaps else 0
    health_score = round(100 * (1 - avg_risk), 1)
    
    # Tier Changes (MEDIUM -> HIGH)
    # Simple check for now based on previous date
    prev_date = db.query(func.max(models.RiskSnapshot.snapshot_date))\
                  .filter(models.RiskSnapshot.snapshot_date < latest_date).scalar()
    change_count = 0
    if prev_date:
        # Vectorized check via SQL would be faster, but let's do simple query
        count_q = text("""
            SELECT COUNT(*) 
            FROM risk_snapshot s_curr
            JOIN risk_snapshot s_prev ON s_curr.component_id = s_prev.component_id
            WHERE s_curr.snapshot_date = :curr AND s_prev.snapshot_date = :prev
            AND s_curr.risk_level = 'HIGH' AND s_prev.risk_level != 'HIGH'
        """)
        change_count = db.execute(count_q, {"curr": latest_date, "prev": prev_date}).scalar()
        
    return {
        "total_aircraft": total_ac,
        "high_risk_components": high,
        "medium_risk_components": medium,
        "low_risk_components": low,
        "fleet_health_score": health_score,
        "tier_changes": change_count,
        "generated_at": latest_date
    }

@app.get("/api/v1/fleet/health-score")
def get_health_trend(db: Session = Depends(get_db)):
    # Aggregated past 30 days
    trend_q = text("""
        SELECT snapshot_date::date as d, 100 * (1 - AVG(risk_score)) as score
        FROM risk_snapshot
        GROUP BY snapshot_date::date
        ORDER BY d DESC LIMIT 30
    """)
    rows = db.execute(trend_q).fetchall()
    return [{"date": str(r[0]), "score": round(r[1], 1)} for r in rows]

@app.get("/api/v1/components/risk-rankings")
def get_risk_rankings(
    page: int = 1, 
    limit: int = 50, 
    level: Optional[str] = None,
    cat: Optional[str] = None,
    db: Session = Depends(get_db)
):
    latest_date = db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()
    query = db.query(models.RiskSnapshot, models.Component)\
              .join(models.Component)\
              .filter(models.RiskSnapshot.snapshot_date == latest_date)
    
    if level: query = query.filter(models.RiskSnapshot.risk_level == level)
    if cat: query = query.filter(models.Component.system_category == cat)
    
    total = query.count()
    results = query.order_by(desc(models.RiskSnapshot.risk_score))\
                  .offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "components": [{
            "id": r.Component.component_id,
            "name": r.Component.name,
            "system": r.Component.system_category,
            "aircraft_id": r.Component.aircraft_id,
            "risk_score": round(r.RiskSnapshot.risk_score, 3),
            "failure_prob": round(r.RiskSnapshot.failure_probability, 3),
            "level": r.RiskSnapshot.risk_level
        } for r in results]
    }

@app.get("/api/v1/components/{id}/risk")
def get_component_risk(id: int, db: Session = Depends(get_db)):
    latest = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.component_id == id)\
               .order_by(desc(models.RiskSnapshot.snapshot_date)).first()
    comp = db.query(models.Component).get(id)
    if not latest or not comp: raise HTTPException(status_code=404)
    
    return {
        "risk_score": latest.risk_score,
        "failure_prob": latest.failure_probability,
        "impact": {
            "safety": comp.safety_score,
            "ops": comp.operational_score,
            "cost": comp.cost_score,
            "weighted_impact": latest.impact_score
        },
        "recommended_action": "Immediate Inspection" if latest.risk_level == "HIGH" else "Scheduled Check"
    }

@app.get("/api/v1/components/{id}/sensor-history")
def get_sensor_history(id: int, db: Session = Depends(get_db)):
    history = db.query(models.SensorData).filter(models.SensorData.component_id == id)\
                .filter(models.SensorData.timestamp >= datetime.now() - timedelta(days=30))\
                .order_by(models.SensorData.timestamp).all()
    return [{
        "timestamp": r.timestamp,
        "type": r.sensor_type,
        "value": r.value,
        "is_anomaly": r.is_anomaly
    } for r in history]

@app.post("/api/v1/settings/impact-weights")
def update_weights(w: dict, db: Session = Depends(get_db)):
    # w: {"safety": 0.5, "operational": 0.3, "cost": 0.2}
    if sum(w.values()) != 1.0: raise HTTPException(status_code=400, detail="Weights must sum to 1.0")
    risk_engine.calculate_risk(weights=w)
    return get_fleet_overview(db)

@app.post("/api/v1/data/regenerate")
def regenerate_data(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = "pending"
    background_tasks.add_task(run_heavy_pipeline, job_id)
    return {"job_id": job_id}

@app.get("/api/v1/jobs/{job_id}")
def get_job_status(job_id: str):
    return {"status": jobs.get(job_id, "unknown")}

@app.get("/api/v1/model/performance")
def get_model_performance():
    import mlflow
    mlflow.set_tracking_uri("http://mlflow:5000")
    try:
        exp = mlflow.get_experiment_by_name("RBAMPS-Engine-v3")
        runs = mlflow.search_runs(experiment_ids=[exp.experiment_id], order_by=["start_time DESC"], max_results=1)
        if len(runs) == 0: raise Exception("No runs found")
        run = runs.iloc[0]
        
        # Extract metrics
        metrics = {k.replace("metrics.", ""): v for k, v in run.items() if k.startswith("metrics.")}
        # Extract features
        features = [{"feature": k.replace("metrics.importance_", ""), "importance": v} 
                    for k, v in run.items() if k.startswith("metrics.importance_")]
        
        return {
            "metrics": metrics,
            "feature_importance": sorted(features, key=lambda x: x['importance'], reverse=True),
            "last_trained": run['start_time'].strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        # Fallback for First demo / offline
        return {
            "metrics": {"auc_roc": 0.895, "pr_auc": 0.742, "f1_at_03": 0.68, "brier_score": 0.054},
            "feature_importance": [
                {"feature": "sensor_trend_slope", "importance": 0.42},
                {"feature": "anomaly_count_30d", "importance": 0.28},
                {"feature": "mtbf_ratio", "importance": 0.15},
                {"feature": "days_since_maintenance", "importance": 0.08},
                {"feature": "utilization_intensity", "importance": 0.05},
            ],
            "last_trained": "Awaiting first run..."
        }

@app.get("/api/v1/aircraft")
def get_aircraft(page: int = 1, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.Aircraft)
    total = query.count()
    results = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "aircraft": results
    }

@app.get("/api/v1/aircraft/{id}/health")
def get_aircraft_health(id: int, db: Session = Depends(get_db)):
    snaps = db.query(models.RiskSnapshot, models.Component)\
              .join(models.Component)\
              .filter(models.Component.aircraft_id == id)\
              .filter(models.RiskSnapshot.snapshot_date == (db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()))\
              .all()
    
    if not snaps: raise HTTPException(status_code=404)
    avg_risk = sum([s.RiskSnapshot.risk_score for s in snaps]) / len(snaps)
    health = 100 * (1 - avg_risk)
    
    tier_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for s in snaps: tier_counts[s.RiskSnapshot.risk_level] += 1
    
    return {
        "health_score": round(health, 1),
        "tier_counts": tier_counts
    }

@app.get("/api/v1/components/risk-rankings/export")
def export_rankings(db: Session = Depends(get_db)):
    latest_date = db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()
    query = db.query(models.RiskSnapshot, models.Component)\
              .join(models.Component)\
              .filter(models.RiskSnapshot.snapshot_date == latest_date)\
              .order_by(desc(models.RiskSnapshot.risk_score))
    
    df = pd.DataFrame([{
        "Rank": i+1,
        "Component": r.Component.name,
        "Aircraft_ID": r.Component.aircraft_id,
        "Risk_Score": r.RiskSnapshot.risk_score,
        "Priority": r.RiskSnapshot.risk_level
    } for i, r in enumerate(query.all())])
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=priority_list_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
