# AeroGuard Predictive Maintenance Pipeline Architecture

This document outlines the data engineering practices and model training strategies implemented in the RBAMPS (Risk-Based Aircraft Maintenance Prediction System) Enterprise Suite.

## 1. Data Engineering Practices

### 🖱️ Synthetic Generation with Drift
To avoid "perfect" (overfitted) models, the `data/generator/generator.py` introduces stochastic patterns:
- **Baseline Sensor Drift**: Each aircraft component has a baseline value that fluctuates with random noise.
- **Slope-Based Degradation**: Failure labels are generated based on the *rate of change* (slope) of sensor data (e.g., EGT, Vibration) over a 30-day window.
- **Climate-Specific Stress**: Aircraft in 'Tropical' and 'Arid' zones experience accelerated degradation factors (1.2x and 1.1x respectively).
- **False Positive Simulation**: Introduced "sensor glitches" where is_anomaly=True but no failure follows, forcing the model to distinguish between noise and actual degradation.

### 🧹 Data Sanitization (Handling Messy Data)
Before features are calculated, raw telemetry undergoes a rigorous cleaning process in `backend/ml/feature_engineering.py`:
- **Deduplication**: Removal of redundant sensor timestamps that can occur during network retries.
- **Outlier Clipping**: We apply quantile-based clipping (1st and 99th percentiles) to remove "phantom spikes" caused by sensor malfunctions.
- **Invalid Value Masking**: Non-physical values (e.g., negative engine temperature) are automatically converted to `NaN`.
- **Linear Interpolation**: Small data gaps are filled using a time-weighted linear interpolation to ensure that trend analysis (slopes) is not skewed by missing samples.

### 🧬 Feature Engineering
The pipeline transforms raw sensor telemetry into high-fidelity features:
- **Rolling Averages**: 7-day and 30-day windows for every sensor.
- **Degradation Slopes**: Linear regression coefficients for sensor trends (e.g., `EGT Trend Slope`).
- **Maintenance Intervals**: `Days Since Last Maintenance` and `Relative Component Age`.
- **Target Variable**: Lead-time binary classification (`will_fail_in_30_days`).

---

## 2. Model Training & Benchmarking

### 🏎️ Multi-Algorithm Benchmarking
Instead of a single model, the `backend/ml/ml_model.py` trains and evaluates:
1. **Logistic Regression** (Baseline)
2. **Decision Trees** (Interpretability)
3. **Random Forests** (Robustness to noise)
4. **Gradient Boosting** (Production - best performance)

### 📈 Evolution of Evaluation Metrics
We prioritize **PR-AUC (Precision-Recall Area Under Curve)** over ROC-AUC.
- **Why?** Sudden component failures are rare (class imbalance). A model can have 0.99 ROC-AUC by simply predicting "No Failure" everywhere. PR-AUC forces the model to actually find the rare failures.
- **Optimal Thresholding**: Failure probabilities are converted to HIGH/MEDIUM/LOW tiers using a sensitivity-tuned threshold (default 0.3) to maximize the F1-Score for safety-critical components.

---

## 3. Explainability & Artifacts

### 🧪 MLflow Tracking
Every training run logs interactive-ready artifacts to the MLflow registry:
- **Confusion Matrix**: Visualizes exactly where the model is making false positive/negative errors.
- **ROC/PR Curves**: Provides visual verification of threshold performance.
- **Feature Importance**: Ranks which sensor signals (like `Vibration Slope`) drove the risk assessment.

### 🤖 Fleet Copilot (Flight Assistant)
The system bridges the gap between ML metrics and ground operations via the **Flight Assistant**:
- **Real-Time Database Queries**: The assistant queries live SQLAlchemy sessions to get current fleet status.
- **Safety Summaries**: Translates raw risk scores into human-readable recommended actions (e.g., "Schedule inspection within 24 hours").

---

## 🛠️ Operational Workflow

1.  **Ingest**: `generator.py` populates PostgreSQL.
2.  **Bootstrap**: `bootstrap.py` ensures schema migrations and data availability.
3.  **Train**: `pipeline.py` executes the multi-model benchmarking.
4.  **Visualize**: `ModelPerformance.tsx` displays the MLflow comparison.
5.  **Act**: Maintenance crews use the **Priority Board** and **Copilot** to schedule repairs.
