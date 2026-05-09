FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
# Use relative path from root context
COPY services/anomaly-detector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source code
COPY services/anomaly-detector/ .

# Expose port (default FastAPI port)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the service
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
