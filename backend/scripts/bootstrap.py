import os
import subprocess
import sys
import time

from sqlalchemy import create_engine, text

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
    with engine.connect() as connection:
        result = connection.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        return int(result.scalar() or 0) > 0


def bootstrap_data_if_needed(engine):
    if table_has_rows(engine, "risk_snapshot"):
        print("Existing risk snapshots detected. Skipping bootstrap generation.")
        return

    print("No risk snapshots found. Bootstrapping synthetic data and initial model artifacts.")
    run_command([sys.executable, "data/generator/generator.py", "--scale", DEFAULT_SCALE])
    run_command([sys.executable, "backend/ml/pipeline.py"])


def main():
    engine = wait_for_database()
    bootstrap_data_if_needed(engine)


if __name__ == "__main__":
    main()
