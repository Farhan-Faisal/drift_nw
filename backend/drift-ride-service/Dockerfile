FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
# COPY app/api/ app/api/
# COPY app/core/ app/core/
# COPY app/models/ app/models/
# COPY main.py .

# COPY .env .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000","--reload","--reload-include","*.py","--log-level", "debug", "--access-log"] 