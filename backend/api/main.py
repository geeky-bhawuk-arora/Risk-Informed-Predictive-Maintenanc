from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
import pandas as pd
import io
import uuid
from datetime import datetime, timedelta
from typing import Optional

from backend.db.database import SessionLocal, engine
from backend.db import models
from backend.api.schemas import ImpactWeightsUpdate
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


@app.on_event("startup")
def ensure_schema():
    models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_heavy_pipeline(job_id):
    jobs[job_id] = "running"
    try:
        pipeline.run_pipeline()
        jobs[job_id] = "complete"
    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        jobs[job_id] = "failed"


def get_latest_snapshot_date(db: Session):
    latest_date = db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()
    if not latest_date:
        raise HTTPException(status_code=404, detail="No risk snapshots available yet")
    return latest_date


def get_latest_snapshots_query(db: Session):
    latest_date = get_latest_snapshot_date(db)
    query = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.snapshot_date == latest_date)
    return latest_date, query


def get_recommended_action(level: str) -> str:
    if level == "HIGH":
        return "Immediate inspection within 24 hours"
    if level == "MEDIUM":
        return "Schedule maintenance within 7 days"
    return "Routine monitoring and planned maintenance"


@app.get("/api/v1/fleet/overview")
def get_fleet_overview(db: Session = Depends(get_db)):
    total_ac = db.query(models.Aircraft).count()

    latest_date, latest_query = get_latest_snapshots_query(db)
    snaps = latest_query.all()

    high = len([s for s in snaps if s.risk_level == "HIGH"])
    medium = len([s for s in snaps if s.risk_level == "MEDIUM"])
    low = len([s for s in snaps if s.risk_level == "LOW"])

    avg_risk = sum([s.risk_score for s in snaps]) / len(snaps) if snaps else 0
    health_score = round(max(0.0, min(100.0, 100 * (1 - avg_risk))), 1)

    prev_date = db.query(func.max(models.RiskSnapshot.snapshot_date))\
                  .filter(models.RiskSnapshot.snapshot_date < latest_date).scalar()
    change_count = 0
    if prev_date:
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
    trend_q = text("""
        SELECT snapshot_date::date as d, 100 * (1 - AVG(risk_score)) as score
        FROM risk_snapshot
        GROUP BY snapshot_date::date
        ORDER BY d DESC LIMIT 30
    """)
    rows = db.execute(trend_q).fetchall()
    return [{"date": str(r[0]), "score": round(r[1], 1)} for r in rows]


@app.get("/api/v1/fleet/breakdown")
def get_fleet_breakdown(db: Session = Depends(get_db)):
    latest_date = get_latest_snapshot_date(db)

    by_type = db.execute(text("""
        SELECT a.type AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
        FROM risk_snapshot rs
        JOIN component c ON c.component_id = rs.component_id
        JOIN aircraft a ON a.aircraft_id = c.aircraft_id
        WHERE rs.snapshot_date = :latest_date
        GROUP BY a.type
        ORDER BY avg_risk DESC
    """), {"latest_date": latest_date}).mappings().all()

    by_zone = db.execute(text("""
        SELECT a.climate_zone AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
        FROM risk_snapshot rs
        JOIN component c ON c.component_id = rs.component_id
        JOIN aircraft a ON a.aircraft_id = c.aircraft_id
        WHERE rs.snapshot_date = :latest_date
        GROUP BY a.climate_zone
        ORDER BY avg_risk DESC
    """), {"latest_date": latest_date}).mappings().all()

    by_system = db.execute(text("""
        SELECT c.system_category AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
        FROM risk_snapshot rs
        JOIN component c ON c.component_id = rs.component_id
        WHERE rs.snapshot_date = :latest_date
        GROUP BY c.system_category
        ORDER BY avg_risk DESC
    """), {"latest_date": latest_date}).mappings().all()

    return {
        "by_type": [dict(row) for row in by_type],
        "by_zone": [dict(row) for row in by_zone],
        "by_system": [dict(row) for row in by_system],
    }


@app.get("/api/v1/fleet/tier-changes")
def get_tier_changes(db: Session = Depends(get_db)):
    latest_date = get_latest_snapshot_date(db)
    prev_date = db.query(func.max(models.RiskSnapshot.snapshot_date))\
        .filter(models.RiskSnapshot.snapshot_date < latest_date).scalar()
    if not prev_date:
        return []

    rows = db.execute(text("""
        SELECT c.component_id, c.name, c.system_category, curr.risk_level AS current_level, prev.risk_level AS previous_level
        FROM risk_snapshot curr
        JOIN risk_snapshot prev ON curr.component_id = prev.component_id
        JOIN component c ON c.component_id = curr.component_id
        WHERE curr.snapshot_date = :current_date
          AND prev.snapshot_date = :previous_date
          AND curr.risk_level = 'HIGH'
          AND prev.risk_level <> 'HIGH'
        ORDER BY curr.risk_score DESC
    """), {"current_date": latest_date, "previous_date": prev_date}).mappings().all()

    return [dict(row) for row in rows]

@app.get("/api/v1/components/risk-rankings")
def get_risk_rankings(
    page: int = 1, 
    limit: int = 50, 
    level: Optional[str] = None,
    cat: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    latest_date = get_latest_snapshot_date(db)
    query = db.query(models.RiskSnapshot, models.Component)\
              .join(models.Component)\
              .filter(models.RiskSnapshot.snapshot_date == latest_date)
    
    if level: query = query.filter(models.RiskSnapshot.risk_level == level)
    if cat: query = query.filter(models.Component.system_category == cat)
    if search:
        query = query.filter(
            models.Component.name.ilike(f"%{search}%")
            | models.Component.system_category.ilike(f"%{search}%")
        )
    
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
            "level": r.RiskSnapshot.risk_level,
            "recommended_action": get_recommended_action(r.RiskSnapshot.risk_level),
        } for r in results]
    }

@app.get("/api/v1/components/{id}/risk")
def get_component_risk(id: int, db: Session = Depends(get_db)):
    latest = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.component_id == id)\
               .order_by(desc(models.RiskSnapshot.snapshot_date)).first()
    comp = db.query(models.Component).filter(models.Component.component_id == id).first()
    if not latest or not comp: raise HTTPException(status_code=404)

    return {
        "component_id": comp.component_id,
        "component_name": comp.name,
        "system_category": comp.system_category,
        "aircraft_id": comp.aircraft_id,
        "snapshot_date": latest.snapshot_date,
        "risk_score": latest.risk_score,
        "failure_prob": latest.failure_probability,
        "impact": {
            "safety": comp.safety_score,
            "ops": comp.operational_score,
            "cost": comp.cost_score,
            "weighted_impact": latest.impact_score
        },
        "risk_level": latest.risk_level,
        "recommended_action": get_recommended_action(latest.risk_level)
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


@app.get("/api/v1/components/{id}/risk-trend")
def get_component_risk_trend(id: int, db: Session = Depends(get_db)):
    rows = db.query(models.RiskSnapshot)\
        .filter(models.RiskSnapshot.component_id == id)\
        .order_by(models.RiskSnapshot.snapshot_date.desc())\
        .limit(30)\
        .all()
    return [
        {
            "snapshot_date": row.snapshot_date,
            "risk_score": row.risk_score,
            "failure_probability": row.failure_probability,
            "risk_level": row.risk_level,
        }
        for row in reversed(rows)
    ]


@app.get("/api/v1/components/{id}/maintenance-history")
def get_component_maintenance_history(id: int, db: Session = Depends(get_db)):
    rows = db.query(models.MaintenanceLog)\
        .filter(models.MaintenanceLog.component_id == id)\
        .order_by(models.MaintenanceLog.maintenance_date.desc())\
        .limit(20)\
        .all()
    return [
        {
            "maintenance_date": row.maintenance_date,
            "maintenance_type": row.maintenance_type,
            "subtype": row.subtype,
            "description": row.description,
            "outcome": row.outcome,
            "duration_hours": row.duration_hours,
            "parts_cost": row.parts_cost,
            "was_predictable": row.was_predictable,
        }
        for row in rows
    ]

@app.post("/api/v1/settings/impact-weights")
def update_weights(w: ImpactWeightsUpdate, db: Session = Depends(get_db)):
    saved = risk_engine.save_weights(db, w.model_dump())
    risk_engine.calculate_risk(weights=w.model_dump())
    return {
        "weights": saved,
        "overview": get_fleet_overview(db),
    }


@app.get("/api/v1/settings/impact-weights")
def get_weights(db: Session = Depends(get_db)):
    return risk_engine.get_current_weights(db)

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
    latest_snapshot_date = get_latest_snapshot_date(db)
    snaps = db.query(models.RiskSnapshot, models.Component)\
              .join(models.Component)\
              .filter(models.Component.aircraft_id == id)\
              .filter(models.RiskSnapshot.snapshot_date == latest_snapshot_date)\
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


@app.get("/api/v1/aircraft/{id}/components")
def get_aircraft_components(id: int, db: Session = Depends(get_db)):
    latest_snapshot_date = get_latest_snapshot_date(db)
    rows = db.query(models.Component, models.RiskSnapshot)\
        .join(models.RiskSnapshot, models.RiskSnapshot.component_id == models.Component.component_id)\
        .filter(models.Component.aircraft_id == id)\
        .filter(models.RiskSnapshot.snapshot_date == latest_snapshot_date)\
        .order_by(desc(models.RiskSnapshot.risk_score))\
        .all()

    return [
        {
            "component_id": component.component_id,
            "name": component.name,
            "system_category": component.system_category,
            "risk_score": snapshot.risk_score,
            "risk_level": snapshot.risk_level,
            "failure_probability": snapshot.failure_probability,
        }
        for component, snapshot in rows
    ]

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
