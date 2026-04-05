# AeroGuard: Enterprise Pipeline Hardening & Traceability
## Thesis Summary & System Architecture Explanation

This document outlines the engineering practices and architectural decisions implemented to transition the AeroGuard Predictive Maintenance system from a prototype to a high-fidelity, explainable production engine.

### 1. Architectural Backbone: Dynamic Data Propagation
We moved away from static, hard-coded datasets to a **Stochastic Multi-Tier Generator**.
- **Asset Traceability:** Implemented `part_number` indexing across the database schema (Component & RiskSnapshot tables) to ensure physical-to-digital twin alignment.
- **Temporal Fidelity:** Increased sensor sampling frequency from 0.5 to 3.0 points/day using a Brownian motion drift model. This ensures that the UI "Multi-Sensor Temporal Resolution" charts show realistic physical transitions rather than sparse indices.

### 2. Pipeline Hardening: Modern ML Infrastructure
The system implements industry-standard robustness for ML lifecycle management:
- **JSON Compliance Layer:** Implemented a sanitization utility in the API boundary to catch and replace `NaN` and `Inf` float values (common in ML metrics) with compliant `0.0`, preventing serialization failures in production.
- **Schema Migration Engine:** Built a custom `bootstrap.py` wrapper that performs `ALTER TABLE` operations on container startup. This avoids destructive `DROP TABLE` flows and ensures the live Postgres instance stays synchronized with the Pydantic/SQLAlchemy models.
- **Explainability (XAI):** The Risk Engine now persists `risk_drivers` (e.g., "Sensor Trend Slope", "Util. Intensity") directly in the snapshot. This allows the UI to render the "Why" behind every priority level, bridging the gap between black-box ML and human maintenance operators.

### 3. Frontend Clarity & Aesthetics
The dashboard was modernized to prioritize actionable intelligence:
- **Information Hierarchy:** Integrated P/N and Asset IDs into the first-fold of the Priority Board.
- **Visual Evidence:** The Detail View now correlates "Risk Equation Analysis" with "Temporal Sensor Resolution," allowing engineers to visually verify the model's flags against raw telemetry trends.

### 4. Deployment Strategy (Modernized)
- **Out-of-the-box (OOB):** Containerized using a multi-service `docker-compose` architecture.
- **Dependency Management:** Synchronized `requirements.txt` across `backend` and `ml-trainer` environments to avoid version-mismatch regressions in production.
- **Staging Orchestration:** Automated bootstrapping logic ensures that a fresh developer clone can run `docker compose up` and arrive at a fully hydrated, trained system in approximately 3 minutes.
