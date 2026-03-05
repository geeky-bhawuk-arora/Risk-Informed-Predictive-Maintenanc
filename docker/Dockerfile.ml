FROM python:3.10-slim

WORKDIR /app
ENV PYTHONPATH=/app

COPY data/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all python code (data, backend/ml, backend/risk_engine)
COPY data/ ./data/
COPY backend/ml/ ./backend/ml/
COPY backend/risk_engine/ ./backend/risk_engine/

# For this demo, the container will simply run the generator once, then the pipeline once,
# then keep alive (or we could use cron, but this is simpler for docker-compose up)

CMD ["sh", "-c", "echo 'Waiting for DB to be ready...' && sleep 10 && python -u data/generator/generator.py && python -u backend/ml/pipeline.py && echo 'ML Pipeline completed. Sleeping...' && sleep infinity"]
