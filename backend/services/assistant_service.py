import re

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.db import models
from backend.services import analytics_service


def _latest_snapshot_date(db: Session):
    return analytics_service.get_latest_snapshot_date(db)


def _top_components(db: Session, limit: int = 5):
    latest_date = _latest_snapshot_date(db)
    rows = db.query(models.RiskSnapshot, models.Component)\
        .join(models.Component)\
        .filter(models.RiskSnapshot.snapshot_date == latest_date)\
        .order_by(desc(models.RiskSnapshot.risk_score))\
        .limit(limit)\
        .all()
    return [{
        "component_id": row.Component.component_id,
        "name": row.Component.name,
        "system_category": row.Component.system_category,
        "aircraft_id": row.Component.aircraft_id,
        "risk_score": round(row.RiskSnapshot.risk_score, 3),
        "risk_level": row.RiskSnapshot.risk_level,
    } for row in rows]


def _top_aircraft_types(db: Session, limit: int = 5):
    latest_date = _latest_snapshot_date(db)
    rows = db.query(
        models.Aircraft.type.label("aircraft_type"),
        func.avg(models.RiskSnapshot.risk_score).label("avg_risk"),
        func.count(models.Component.component_id).label("component_count"),
    )\
        .join(models.Component, models.Component.aircraft_id == models.Aircraft.aircraft_id)\
        .join(models.RiskSnapshot, models.RiskSnapshot.component_id == models.Component.component_id)\
        .filter(models.RiskSnapshot.snapshot_date == latest_date)\
        .group_by(models.Aircraft.type)\
        .order_by(desc("avg_risk"))\
        .limit(limit)\
        .all()
    return [{
        "aircraft_type": row.aircraft_type,
        "avg_risk": round(float(row.avg_risk), 3),
        "component_count": int(row.component_count),
    } for row in rows]


def _system_exposure(db: Session, limit: int = 5):
    latest_date = _latest_snapshot_date(db)
    rows = db.query(
        models.Component.system_category,
        func.avg(models.RiskSnapshot.risk_score).label("avg_risk"),
        func.count(models.Component.component_id).label("component_count"),
    )\
        .join(models.RiskSnapshot, models.RiskSnapshot.component_id == models.Component.component_id)\
        .filter(models.RiskSnapshot.snapshot_date == latest_date)\
        .group_by(models.Component.system_category)\
        .order_by(desc("avg_risk"))\
        .limit(limit)\
        .all()
    return [{
        "system_category": row.system_category,
        "avg_risk": round(float(row.avg_risk), 3),
        "component_count": int(row.component_count),
    } for row in rows]


def answer_question(db: Session, question: str):
    normalized = question.strip()
    lowered = normalized.lower()
    overview = analytics_service.get_fleet_overview(db)
    suggestions = [
        "Give me a fleet summary.",
        "What are the top 5 highest-risk components right now?",
        "Which aircraft type has the highest average risk?",
        "Show system exposure by category.",
        "Explain component 42.",
    ]

    if not normalized:
        return {
            "answer": "Ask about fleet health, top-risk components, aircraft model exposure, tier changes, or a specific component by ID.",
            "intent": "help",
            "data": {},
            "suggestions": suggestions,
        }

    component_match = re.search(r"\bcomponent\s+(\d+)\b", lowered)
    if component_match:
        component_id = int(component_match.group(1))
        detail = analytics_service.get_component_risk(db, component_id)
        status_msg = "Maintenance check is COMPLETED." if detail.get('is_checked') else "Maintenance check is PENDING."
        comments_msg = f" Team notes: {detail['comments']}" if detail.get('comments') else ""
        
        return {
            "answer": (
                f"Component {component_id} ({detail['component_name']}) is currently ranked as {detail['risk_level']} risk "
                f"(score: {detail['risk_score']:.3f}). {status_msg}{comments_msg} "
                f"Recommended action: {detail['recommended_action']}."
            ),
            "intent": "component_detail",
            "data": detail,
            "suggestions": suggestions,
        }

    if "top" in lowered or "highest-risk" in lowered or "high risk" in lowered:
        components = _top_components(db)
        answer = "; ".join(
            f"{item['name']} (component {item['component_id']}) at {item['risk_score']:.3f}"
            for item in components
        )
        return {
            "answer": f"The highest-risk components right now are: {answer}.",
            "intent": "top_components",
            "data": {"components": components},
            "suggestions": suggestions,
        }

    if "aircraft type" in lowered or "model" in lowered:
        aircraft_types = _top_aircraft_types(db)
        leader = aircraft_types[0] if aircraft_types else None
        return {
            "answer": (
                f"{leader['aircraft_type']} currently has the highest average risk at {leader['avg_risk']:.3f} "
                f"across {leader['component_count']} components."
                if leader else "I could not compute aircraft model exposure right now."
            ),
            "intent": "aircraft_type_exposure",
            "data": {"aircraft_types": aircraft_types},
            "suggestions": suggestions,
        }

    if "system" in lowered or "category" in lowered or "exposure" in lowered:
        systems = _system_exposure(db)
        leader = systems[0] if systems else None
        return {
            "answer": (
                f"{leader['system_category']} is the highest-exposure system category with average risk {leader['avg_risk']:.3f}."
                if leader else "I could not compute system exposure right now."
            ),
            "intent": "system_exposure",
            "data": {"systems": systems},
            "suggestions": suggestions,
        }

    if "tier change" in lowered or "moved into high" in lowered or "escalat" in lowered:
        changes = analytics_service.get_tier_changes(db)
        return {
            "answer": f"{len(changes)} components moved into HIGH risk since the previous snapshot.",
            "intent": "tier_changes",
            "data": {"tier_changes": changes},
            "suggestions": suggestions,
        }

    return {
        "answer": (
            f"The fleet currently covers {overview['total_aircraft']} aircraft, with health {overview['fleet_health_score']}%, "
            f"{overview['high_risk_components']} HIGH-risk components, and {overview['tier_changes']} recent tier escalations."
        ),
        "intent": "fleet_overview",
        "data": {"overview": overview},
        "suggestions": suggestions,
    }
