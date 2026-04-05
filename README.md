# 🛡️ AeroGuard: Risk-Based Aircraft Maintenance Prediction

![AeroGuard Banner](docs/assets/aeroguard_banner.png)

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**AeroGuard** is a sophisticated end-to-end framework designed to prioritize aircraft maintenance through a rigorous risk-assessment engine. By blending real-time telemetry, predictive machine learning, and operational impact analysis, AeroGuard ensures that critical issues are addressed before they compromise safety or scheduling.

> **Risk Score = Failure Probability × Operational Impact**

---

## 🏗️ System Architecture

AeroGuard employs a modern 4-tier containerized architecture for maximum scalability and reliability:

1.  **📊 Database Layer (PostgreSQL)**: The source of truth for aircraft telemetry, component health histories, and maintenance logs.
2.  **🧠 Risk Engine & ML (Python)**:
    *   **Data Generation**: Simulates complex flight operations and sensor fluctuations.
    *   **Feature Engineering**: Extracts high-fidelity health indicators from raw telemetry.
    *   **ML Pipeline**: Predicts failure probabilities using an MLflow-tracked Logistic Regression model.
3.  **🔌 Backend API (FastAPI)**: A high-performance gateway serving risk distributions, fleet analytics, and maintenance priority lists.
4.  **🖥️ Frontend Dashboard (React + Vite)**: A premium, dark-mode specialized interface for real-time fleet monitoring and decision support.

---

## ✨ Key Features

*   **📈 Fleet Health Monitoring**: A high-level command center displaying critical KPIs, risk distributions, and fleet-wide maintenance status.
*   **⚖️ Dynamic Priority Board**: An intelligent, sortable ranking system that calculates urgency based on component severity and failure likelihood.
*   **🔍 Telemetry Deep-Dive**: Granular visualization of sensor trends (Temperature, Vibration, Pressure) for every component in the fleet.
*   **⚡ On-Demand Recomputation**: Instantly trigger the ML pipeline via the dashboard to process fresh telemetry and update risk scores in real-time.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Docker Desktop](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation & Deployment

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/geeky-bhawuk-arora/AeroGuard.git
    cd AeroGuard
    ```

2.  **Launch the Infrastructure**
    ```bash
    docker-compose up --build
    ```
    This command orchestrates four primary services:
    - `db`: PostgreSQL persistence (Port `5432`)
    - `ml-service`: Lifecycle generator and ML training
    - `backend`: FastAPI Gateway (Port `8000`)
    - `frontend`: Vite Dashboard (Port `5173`)

3.  **Access the Dashboard**
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Structure

```text
├── backend/            # FastAPI + SQLAlchemy + Business Logic
├── data/               # Synthetic Telemetry Generators
├── docker/             # Dockerfiles & Service Configurations
├── frontend/           # React + Tailwind Dashboard
└── docs/               # Technical Documentation & Assets
```

---

## 👨‍💻 Author

Developed with care by **[Bhawuk Arora](https://github.com/geeky-bhawuk-arora)**.  
*Building the future of predictive aviation safety.*
