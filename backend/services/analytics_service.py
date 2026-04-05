from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session

from backend.db import models


def get_latest_snapshot_date(db: Session):
    latest_date = db.query(func.max(models.RiskSnapshot.snapshot_date)).scalar()
    if not latest_date:
        raise HTTPException(status_code=404, detail="No risk snapshots available yet")
    return latest_date


def get_recommended_action(level: str) -> str:
    if level == "HIGH":
        return "Immediate inspection within 24 hours"
    if level == "MEDIUM":
        return "Schedule maintenance within 7 days"
    return "Routine monitoring and planned maintenance"


def get_fleet_overview(db: Session):
    latest_date = get_latest_snapshot_date(db)
    total_ac = db.query(models.Aircraft).count()
    snaps = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.snapshot_date == latest_date).all()

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
        "generated_at": latest_date,
    }


def get_health_trend(db: Session):
    trend_q = text("""
        SELECT snapshot_date::date as d, 100 * (1 - AVG(risk_score)) as score
        FROM risk_snapshot
        GROUP BY snapshot_date::date
        ORDER BY d DESC LIMIT 30
    """)
    rows = db.execute(trend_q).fetchall()
    return [{"date": str(r[0]), "score": round(r[1], 1)} for r in rows]


def get_fleet_breakdown(db: Session):
    latest_date = get_latest_snapshot_date(db)

    def query(sql: str):
        rows = db.execute(text(sql), {"latest_date": latest_date}).mappings().all()
        return [dict(row) for row in rows]

    return {
        "by_type": query("""
            SELECT a.type AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
            FROM risk_snapshot rs
            JOIN component c ON c.component_id = rs.component_id
            JOIN aircraft a ON a.aircraft_id = c.aircraft_id
            WHERE rs.snapshot_date = :latest_date
            GROUP BY a.type
            ORDER BY avg_risk DESC
        """),
        "by_zone": query("""
            SELECT a.climate_zone AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
            FROM risk_snapshot rs
            JOIN component c ON c.component_id = rs.component_id
            JOIN aircraft a ON a.aircraft_id = c.aircraft_id
            WHERE rs.snapshot_date = :latest_date
            GROUP BY a.climate_zone
            ORDER BY avg_risk DESC
        """),
        "by_system": query("""
            SELECT c.system_category AS name, ROUND(AVG(rs.risk_score)::numeric, 3) AS avg_risk
            FROM risk_snapshot rs
            JOIN component c ON c.component_id = rs.component_id
            WHERE rs.snapshot_date = :latest_date
            GROUP BY c.system_category
            ORDER BY avg_risk DESC
        """),
    }


def get_tier_changes(db: Session):
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


def get_risk_rankings(db: Session, page: int, limit: int, level: Optional[str], cat: Optional[str], search: Optional[str]):
    latest_date = get_latest_snapshot_date(db)
    query = db.query(models.RiskSnapshot, models.Component)\
        .join(models.Component)\
        .filter(models.RiskSnapshot.snapshot_date == latest_date)

    if level:
        query = query.filter(models.RiskSnapshot.risk_level == level)
    if cat:
        query = query.filter(models.Component.system_category == cat)
    if search:
        query = query.filter(
            models.Component.name.ilike(f"%{search}%")
            | models.Component.system_category.ilike(f"%{search}%")
            | models.Component.component_type.ilike(f"%{search}%")
        )

    total = query.count()
    results = query.order_by(desc(models.RiskSnapshot.risk_score)).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "components": [{
            "id": row.Component.component_id,
            "name": row.Component.name,
            "system": row.Component.system_category,
            "aircraft_id": row.Component.aircraft_id,
            "risk_score": round(row.RiskSnapshot.risk_score, 3),
            "failure_prob": round(row.RiskSnapshot.failure_probability, 3),
            "level": row.RiskSnapshot.risk_level,
            "risk_drivers": row.RiskSnapshot.risk_drivers,
            "recommended_action": get_recommended_action(row.RiskSnapshot.risk_level),
        } for row in results],
    }


def get_component_risk(db: Session, component_id: int):
    latest = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.component_id == component_id)\
        .order_by(desc(models.RiskSnapshot.snapshot_date)).first()
    comp = db.query(models.Component).filter(models.Component.component_id == component_id).first()
    if not latest or not comp:
        raise HTTPException(status_code=404)

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
            "weighted_impact": latest.impact_score,
        },
        "risk_level": latest.risk_level,
        "risk_drivers": latest.risk_drivers,
        "recommended_action": get_recommended_action(latest.risk_level),
        "comments": latest.comments,
        "is_checked": latest.is_checked,
    }


def update_component_risk(db: Session, component_id: int, comments: Optional[str], is_checked: Optional[bool]):
    latest = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.component_id == component_id)\
        .order_by(desc(models.RiskSnapshot.snapshot_date)).first()
    if not latest:
        raise HTTPException(status_code=404)
    
    if comments is not None:
        latest.comments = comments
    if is_checked is not None:
        latest.is_checked = is_checked
    
    db.commit()
    db.refresh(latest)
    return get_component_risk(db, component_id)


def get_component_sensor_history(db: Session, component_id: int):
    history = db.query(models.SensorData).filter(models.SensorData.component_id == component_id)\
        .filter(models.SensorData.timestamp >= datetime.now() - timedelta(days=30))\
        .order_by(models.SensorData.timestamp).all()
    return [{
        "timestamp": row.timestamp,
        "type": row.sensor_type,
        "value": row.value,
        "is_anomaly": row.is_anomaly,
    } for row in history]


def get_component_risk_trend(db: Session, component_id: int):
    rows = db.query(models.RiskSnapshot)\
        .filter(models.RiskSnapshot.component_id == component_id)\
        .order_by(models.RiskSnapshot.snapshot_date.desc())\
        .limit(30).all()
    return [{
        "snapshot_date": row.snapshot_date,
        "risk_score": row.risk_score,
        "failure_probability": row.failure_probability,
        "risk_level": row.risk_level,
    } for row in reversed(rows)]


def get_component_maintenance_history(db: Session, component_id: int):
    rows = db.query(models.MaintenanceLog)\
        .filter(models.MaintenanceLog.component_id == component_id)\
        .order_by(models.MaintenanceLog.maintenance_date.desc())\
        .limit(20).all()
    return [{
        "maintenance_date": row.maintenance_date,
        "maintenance_type": row.maintenance_type,
        "subtype": row.subtype,
        "description": row.description,
        "outcome": row.outcome,
        "duration_hours": row.duration_hours,
        "parts_cost": row.parts_cost,
        "was_predictable": row.was_predictable,
    } for row in rows]


def get_aircraft_page(db: Session, page: int, limit: int):
    query = db.query(models.Aircraft)
    total = query.count()
    results = query.offset((page - 1) * limit).limit(limit).all()
    return {"total": total, "aircraft": results}


def get_aircraft_health(db: Session, aircraft_id: int):
    latest_snapshot_date = get_latest_snapshot_date(db)
    snaps = db.query(models.RiskSnapshot, models.Component)\
        .join(models.Component)\
        .filter(models.Component.aircraft_id == aircraft_id)\
        .filter(models.RiskSnapshot.snapshot_date == latest_snapshot_date).all()
    if not snaps:
        raise HTTPException(status_code=404)

    avg_risk = sum([row.RiskSnapshot.risk_score for row in snaps]) / len(snaps)
    tier_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for row in snaps:
        tier_counts[row.RiskSnapshot.risk_level] += 1

    return {
        "health_score": round(100 * (1 - avg_risk), 1),
        "tier_counts": tier_counts,
    }


def get_aircraft_components(db: Session, aircraft_id: int):
    latest_snapshot_date = get_latest_snapshot_date(db)
    rows = db.query(models.Component, models.RiskSnapshot)\
        .join(models.RiskSnapshot, models.RiskSnapshot.component_id == models.Component.component_id)\
        .filter(models.Component.aircraft_id == aircraft_id)\
        .filter(models.RiskSnapshot.snapshot_date == latest_snapshot_date)\
        .order_by(desc(models.RiskSnapshot.risk_score)).all()

    return [{
        "component_id": component.component_id,
        "name": component.name,
        "system_category": component.system_category,
        "risk_score": snapshot.risk_score,
        "risk_level": snapshot.risk_level,
        "failure_probability": snapshot.failure_probability,
    } for component, snapshot in rows]


def export_rankings_csv(db: Session):
    latest_date = get_latest_snapshot_date(db)
    query = db.query(models.RiskSnapshot, models.Component)\
        .join(models.Component)\
        .filter(models.RiskSnapshot.snapshot_date == latest_date)\
        .order_by(desc(models.RiskSnapshot.risk_score))

    df = pd.DataFrame([{
        "Rank": index + 1,
        "Component": row.Component.name,
        "Aircraft_ID": row.Component.aircraft_id,
        "Risk_Score": row.RiskSnapshot.risk_score,
        "Priority": row.RiskSnapshot.risk_level,
    } for index, row in enumerate(query.all())])
    return df.to_csv(index=False)
