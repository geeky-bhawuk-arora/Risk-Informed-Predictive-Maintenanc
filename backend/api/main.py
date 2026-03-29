from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io
import uuid
from datetime import datetime
from typing import Optional

from backend.db.database import SessionLocal, engine
from backend.db import models
from backend.api.assistant_schemas import AssistantQuestionRequest
from backend.api.schemas import ImpactWeightsUpdate, RiskUpdate
from backend.ml import pipeline
from backend.risk_engine import risk_engine
from backend.services import analytics_service, model_service, assistant_service

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


@app.get("/api/v1/fleet/overview")
def get_fleet_overview(db: Session = Depends(get_db)):
    return analytics_service.get_fleet_overview(db)

@app.get("/api/v1/fleet/health-score")
def get_health_trend(db: Session = Depends(get_db)):
    return analytics_service.get_health_trend(db)


@app.get("/api/v1/fleet/breakdown")
def get_fleet_breakdown(db: Session = Depends(get_db)):
    return analytics_service.get_fleet_breakdown(db)


@app.get("/api/v1/fleet/tier-changes")
def get_tier_changes(db: Session = Depends(get_db)):
    return analytics_service.get_tier_changes(db)

@app.get("/api/v1/components/risk-rankings")
def get_risk_rankings(
    page: int = 1, 
    limit: int = 50, 
    level: Optional[str] = None,
    cat: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return analytics_service.get_risk_rankings(db, page, limit, level, cat, search)

@app.get("/api/v1/components/{id}/risk")
def get_component_risk(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_component_risk(db, id)

@app.patch("/api/v1/components/{id}/risk")
def update_component_risk(id: int, payload: RiskUpdate, db: Session = Depends(get_db)):
    return analytics_service.update_component_risk(db, id, payload.comments, payload.is_checked)

@app.get("/api/v1/components/{id}/sensor-history")
def get_sensor_history(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_component_sensor_history(db, id)


@app.get("/api/v1/components/{id}/risk-trend")
def get_component_risk_trend(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_component_risk_trend(db, id)


@app.get("/api/v1/components/{id}/maintenance-history")
def get_component_maintenance_history(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_component_maintenance_history(db, id)

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
    return model_service.get_model_performance()

@app.get("/api/v1/aircraft")
def get_aircraft(page: int = 1, limit: int = 50, db: Session = Depends(get_db)):
    return analytics_service.get_aircraft_page(db, page, limit)

@app.get("/api/v1/aircraft/{id}/health")
def get_aircraft_health(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_aircraft_health(db, id)


@app.get("/api/v1/aircraft/{id}/components")
def get_aircraft_components(id: int, db: Session = Depends(get_db)):
    return analytics_service.get_aircraft_components(db, id)

@app.get("/api/v1/components/risk-rankings/export")
def export_rankings(db: Session = Depends(get_db)):
    output = io.StringIO()
    output.write(analytics_service.export_rankings_csv(db))
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=priority_list_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@app.post("/api/v1/assistant/ask")
def ask_assistant(payload: AssistantQuestionRequest, db: Session = Depends(get_db)):
    return assistant_service.answer_question(db, payload.question)
