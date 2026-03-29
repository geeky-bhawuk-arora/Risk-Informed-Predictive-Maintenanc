FROM python:3.10-slim

WORKDIR /app

# System dependencies for psycopg2 and building ML extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install ML and Data dependencies
COPY data/requirements.txt ./data_requirements.txt
RUN pip install --no-cache-dir -r data_requirements.txt

# Copy entire project context to maintain absolute import hierarchy
COPY . .

# Ensure the root is in PYTHONPATH so 'backend.xxx' and 'data.xxx' work
ENV PYTHONPATH=/app

# Startup logic: Wait for DB -> Generate Data -> Run ML Pipeline
CMD ["sh", "-c", "echo 'Waiting for DB to be operational...' && sleep 15 && \
    python -u data/generator/generator.py --scale small && \
    python -u backend/ml/pipeline.py && \
    echo 'Pipeline complete. Artifacts stored.' && sleep infinity"]
