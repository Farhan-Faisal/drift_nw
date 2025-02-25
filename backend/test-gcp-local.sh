#!/bin/bash
# Script to test GCP secrets locally

# Set environment variables for GCP authentication
export CLOUD_PROVIDER=gcp_local
export GCP_PROJECT_ID="your-gcp-project-id"  # Replace with your actual GCP project ID
export TRANSLINK_SECRET_NAME="TRANSLINK_KEY"  # The name of your secret in GCP Secret Manager

# Path to your GCP credentials file (service account key)
export GCP_CREDENTIALS_FILE="./path/to/your-gcp-credentials.json"  # Replace with actual path
export GOOGLE_APPLICATION_CREDENTIALS="$GCP_CREDENTIALS_FILE"

# Run the docker-compose with these environment variables
cd "$(dirname "$0")"
docker-compose up 