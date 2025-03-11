FROM --platform=linux/amd64 python:3.9-slim

# Set environment variables early in the build
ENV API_KEY=${API_KEY}

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Use python -m to run uvicorn instead of direct execution
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug"]