import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.ml.feature_engineering import run_feature_engineering
from backend.ml.ml_model import train_and_predict
from backend.risk_engine.risk_engine import calculate_risk

def run_pipeline():
    print("=== STARTING MASTER ML & RISK PIPELINE (v3 Alignment) ===")
    
    # 1. Compute 16+ features including 30-day failure labels
    run_feature_engineering()
    
    # 2. Train baseline (Logistic) and primary (GB) models with GroupKFold
    # Logs performance and feature importance to MLflow
    train_and_predict()
    
    # 3. Vectorized Risk Score computation for the entire fleet (8,000+ components)
    # Stores initial RiskSnapshot
    calculate_risk()
    
    print("=== PIPELINE COMPLETE: SYSTEM SYNCHRONIZED ===")

if __name__ == "__main__":
    run_pipeline()
