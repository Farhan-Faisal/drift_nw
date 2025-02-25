# GCP Secret Manager Setup for Drift Services

This document outlines how to set up Google Cloud Secret Manager for the Drift Services and test it locally.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. `gcloud` CLI tool installed locally
3. Access to create service accounts and manage secrets in GCP

## Setting Up GCP Secret Manager

### Step 1: Create a GCP Project (if not already done)

```sh
# Create a new project
gcloud projects create [YOUR_PROJECT_ID] --name="Drift Services"

# Set the project as default
gcloud config set project [YOUR_PROJECT_ID]
```

### Step 2: Enable the Secret Manager API

```sh
gcloud services enable secretmanager.googleapis.com
```

### Step 3: Create a Secret for the Translink API Key

```sh
# Create the secret
gcloud secrets create TRANSLINK_KEY --replication-policy="automatic"

# Add the version with the actual API key
echo -n "your-translink-api-key" | gcloud secrets versions add TRANSLINK_KEY --data-file=-
```

### Step 4: Create a Service Account for Local Testing

```sh
# Create a service account
gcloud iam service-accounts create drift-service-local-test \
    --display-name="Drift Service Local Test Account"

# Give the service account access to the secret
gcloud secrets add-iam-policy-binding TRANSLINK_KEY \
    --member="serviceAccount:drift-service-local-test@[YOUR_PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Create and download a key for the service account
gcloud iam service-accounts keys create ./gcp-credentials.json \
    --iam-account=drift-service-local-test@[YOUR_PROJECT_ID].iam.gserviceaccount.com
```

## Testing Locally

### Option 1: Using the Test Script

1. Edit the `test-gcp-local.sh` script with your actual GCP project ID and credentials path:

```sh
export GCP_PROJECT_ID="your-gcp-project-id"  # Replace with your actual GCP project ID
export GCP_CREDENTIALS_FILE="./path/to/your-gcp-credentials.json"  # Replace with actual path
```

2. Run the script:

```sh
./test-gcp-local.sh
```

### Option 2: Manual Environment Setup

1. Set the necessary environment variables:

```sh
export CLOUD_PROVIDER=gcp_local
export GCP_PROJECT_ID="your-gcp-project-id"
export TRANSLINK_SECRET_NAME="TRANSLINK_KEY"
export GCP_CREDENTIALS_FILE="./path/to/your-gcp-credentials.json"
export GOOGLE_APPLICATION_CREDENTIALS="$GCP_CREDENTIALS_FILE"
```

2. Run docker-compose:

```sh
docker-compose up
```

## Debugging

If you encounter issues:

1. Check the logs for any error messages:
```sh
docker-compose logs drift-ingestion-service
```

2. Verify your service account has appropriate access to the secret
3. Ensure the secret exists and has a valid version
4. Validate the GCP credentials JSON file is accessible

## Deployment to GCP

When deploying to GCP:

1. Set `CLOUD_PROVIDER=gcp` in your environment
2. For GCP Compute Engine VMs or GKE, use service account attachments rather than credential files
3. For VM deployments, create a service account with secretAccessor roles 