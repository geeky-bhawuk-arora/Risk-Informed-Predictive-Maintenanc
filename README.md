# Risk-Based Aircraft Maintenance Prioritization System

This is a complete end-to-end system for prioritizing aircraft maintenance actions based on a risk framework.

> **Risk Score = Failure Probability × Impact**

The system predicts component failures using machine learning and evaluates their operational/safety impacts to rank maintenance priorities.

## Architecture

1. **Database Layer (PostgreSQL)**: Stores aircraft telemetry, component data, maintenance logs, and prioritized risk metrics.
2. **Machine Learning & Data Generator (Python)**:
    *   Generates synthetic flight operations, sensor readings, and maintenance events.
    *   Extracts aggregated features (Feature Engineering).
    *   Predicts 30-day failure probabilities using a Logistic Regression model (tracked via MLflow).
    *   Computes final risk scores and maintenance priorities using an impact-weighting engine.
3. **Backend API (FastAPI)**: Serves fleet data, individual component telemetry, risk distributions, and priority lists. Includes a webhook to re-trigger the ML pipeline.
4. **Frontend Dashboard (React + Vite + TailwindCSS)**: Visualizes clear fleet-level overviews, prioritized maintenance lists, and drill-down views into sensor trends for components.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Running the Application

The entire application stack is containerized and managed via Docker Compose.

1.  **Clone the repository** (or navigate to the project directory):
    ```bash
    cd risk-based-aircraft-maintenance
    ```

2.  **Build and Start the Containers:**
    ```bash
    docker-compose up --build
    ```
    This command will spin up 4 services:
    *   `db`: PostgreSQL database on port `5432`.
    *   `ml-service`: Runs the Python data generator and ML pipeline on startup.
    *   `backend`: FastAPI server available on port `8000`.
    *   `frontend`: React application available on port `5173`.

## Accessing the System

Once the containers are successfully running, access the interfaces:

*   **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
*   **Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

## Project Structure

```text
├── backend/
│   ├── api/            # FastAPI application routing
│   ├── db/             # SQLAlchemy schemas and database connection
│   ├── ml/             # ML Model and Feature Engineering scripts
│   ├── risk_engine/    # Risk score calculation and priority ranking
│   └── requirements.txt
├── data/
│   ├── generator/      # Synthetic data generator script
│   └── requirements.txt
├── docker/
│   ├── init.sql        # Database initialization script
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── Dockerfile.ml
├── frontend/           # React + Vite application
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── docker-compose.yml
```

## Dashboard Features

1.  **Fleet Overview:** High-level metrics showing total aircraft, high-risk counts, and an aggregated distribution chart of component risk levels.
2.  **Priority Board:** An actionable, sortable table ranking components based on their computed risk score and severity. Displays required actions (e.g. "Immediate Inspection").
3.  **Component Health:** Detailed drill-down view showing real-time telemetry (Temperature and Vibration charts) alongside component-specific failure probabilities.

## Recomputing Risk

To simulate real-time ML retraining or ad-hoc data processing, use the **Recompute Risk** button located in the dashboard sidebar. This queries the backend, asynchronously kicking off the Python ML Pipeline, predicting fresh probability sets, and overriding the Priority Table.
