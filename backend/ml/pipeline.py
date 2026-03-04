import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.ml.feature_engineering import run_feature_engineering
from backend.ml.ml_model import train_and_predict
from backend.risk_engine.risk_engine import calculate_risk

def run_pipeline():
    print("=== STARTING ML & RISK PIPELINE ===")
    run_feature_engineering()
    train_and_predict()
    calculate_risk()
    print("=== PIPELINE COMPLETE ===")

if __name__ == "__main__":
    run_pipeline()
