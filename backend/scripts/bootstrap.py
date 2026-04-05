import os
import subprocess
import sys
import time

from sqlalchemy import create_engine, text
from backend.db import models
from backend.db.database import engine as db_engine

DB_URL = os.getenv("DATABASE_URL", "postgresql://risk_user:risk_password@db:5432/risk_db")
DEFAULT_SCALE = os.getenv("RBAMPS_BOOTSTRAP_SCALE", "small")


def run_command(args):
    subprocess.run(args, check=True)


def wait_for_database(max_attempts: int = 30, delay_seconds: int = 2):
    engine = create_engine(DB_URL)
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database connection established.")
            return engine
        except Exception as exc:
            print(f"Waiting for database ({attempt}/{max_attempts}): {exc}")
            time.sleep(delay_seconds)
    raise RuntimeError("Database did not become ready in time.")


def table_has_rows(engine, table_name: str) -> bool:
    try:
        with engine.connect() as connection:
            # Check if table exists first using information schema
            exists_q = text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table)")
            exists = connection.execute(exists_q, {"table": table_name}).scalar()
            if not exists:
                return False
            
            # If it exists, check row count
            result = connection.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return int(result.scalar() or 0) > 0
    except Exception as e:
        print(f"Check failed for {table_name}: {e}")
        return False


def bootstrap_data_if_needed(engine):
    if table_has_rows(engine, "risk_snapshot"):
        print("Existing risk snapshots detected. Skipping bootstrap generation.")
        return

    print("No risk snapshots found. Bootstrapping synthetic data and initial model artifacts.")
    run_command([sys.executable, "data/generator/generator.py", "--scale", DEFAULT_SCALE])
    run_command([sys.executable, "backend/ml/pipeline.py"])


def ensure_schema_migrations(engine):
    print("Checking for schema migrations...")
    needed_columns = {
        "risk_drivers": "TEXT",
        "comments": "TEXT",
        "is_checked": "BOOLEAN DEFAULT FALSE"
    }
    
    try:
        with engine.connect() as connection:
            for col_name, col_type in needed_columns.items():
                col_exists_q = text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'risk_snapshot' AND column_name = :col
                    )
                """)
                col_exists = connection.execute(col_exists_q, {"col": col_name}).scalar()
                
                if not col_exists:
                    print(f"Migration: Adding missing '{col_name}' column to 'risk_snapshot' table.")
                    connection.execute(text(f"ALTER TABLE risk_snapshot ADD COLUMN {col_name} {col_type}"))
                    connection.commit()
    except Exception as e:
        print(f"Migration check failed: {e}")

def main():
    engine = wait_for_database()
    models.Base.metadata.create_all(bind=db_engine)
    ensure_schema_migrations(engine)
    bootstrap_data_if_needed(engine)


if __name__ == "__main__":
    main()
