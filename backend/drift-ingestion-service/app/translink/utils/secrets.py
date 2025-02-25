import os
from datetime import datetime
from pathlib import Path
import sys
import boto3

import pandas as pd
import requests
from google.transit import gtfs_realtime_pb2
# Fix the import for Google Cloud Secret Manager
try:
    from google.cloud import secretmanager
    HAS_GCP = True
except ImportError:
    HAS_GCP = False
from dotenv import load_dotenv

load_dotenv()


class SecretsManager:
    def __init__(self, cloud_provider: str):
        """
        Initialize the SecretsManager with the specified cloud provider.
        
        Args:
            cloud_provider: One of 'local', 'aws', 'gcp', or 'gcp_local'
                - 'local': Uses environment variables from .env
                - 'aws': Uses AWS SSM Parameter Store
                - 'gcp': Uses Google Cloud Secret Manager in GCP environment
                - 'gcp_local': Uses Google Cloud Secret Manager from local environment with credentials
        """
        self.cloud_provider = cloud_provider

    def get_parameter(self, name):
        """
        Get a parameter value from the configured secrets backend.
        
        Args:
            name: For local, env var name.
                  For AWS, the parameter name in Parameter Store.
                  For GCP, the full secret name including project and version.
                  
        Returns:
            The secret value as a string.
        """
        if self.cloud_provider == 'local':
            return os.getenv(name)

        elif self.cloud_provider == 'aws':
            ssm = boto3.client('ssm')
            response = ssm.get_parameter(
                Name=name,
                WithDecryption=True
            )
            return response['Parameter']['Value']

        elif self.cloud_provider in ['gcp', 'gcp_local']: 
            if not HAS_GCP:
                raise ImportError("Google Cloud Secret Manager is not installed. Run 'pip install google-cloud-secret-manager'")
            
            # Create the Secret Manager client
            client = secretmanager.SecretManagerServiceClient()
            
            # Parse the secret name
            # For GCP, expecting format: "projects/{project}/secrets/{secret}/versions/{version}"
            # For gcp_local with simplified naming, we'll construct the full name
            if self.cloud_provider == 'gcp_local' and '/' not in name:
                # Get project ID from environment or default
                project_id = os.getenv('GCP_PROJECT_ID')
                if not project_id:
                    raise ValueError("GCP_PROJECT_ID environment variable is required for gcp_local mode")
                
                # Construct full secret path with latest version
                name = f"projects/{project_id}/secrets/{name}/versions/latest"
            
            # Access the secret version
            try:
                response = client.access_secret_version(name=name)
                # Return the decoded payload
                return response.payload.data.decode('UTF-8')
            except Exception as e:
                print(f"Error accessing GCP secret {name}: {e}")
                raise
        else:
            raise ValueError(f"Unsupported cloud provider: {self.cloud_provider}")