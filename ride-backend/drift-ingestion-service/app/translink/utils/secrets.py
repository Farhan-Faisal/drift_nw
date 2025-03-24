import os
from datetime import datetime
from pathlib import Path
import sys
import boto3

import pandas as pd
import requests
from google.transit import gtfs_realtime_pb2
from google.cloud import secretmanager
from dotenv import load_dotenv

load_dotenv()


class SecretsManager:
    def __init__(self, cloud_provider: str):
        self.cloud_provider = cloud_provider

    def get_parameter(self, name):

        if self.cloud_provider == 'local':
            return os.getenv(name)

        elif self.cloud_provider == 'aws':
            ssm = boto3.client('ssm')
            response = ssm.get_parameter(
                Name=name,
                WithDecryption=True
            )
            return response['Parameter']['Value']

        elif self.cloud_provider == 'gcp': 
            client = secretmanager.SecretManagerServiceClient()
            # Access the secret version
            response = client.access_secret_version(name=name)
            # Return the secret payload
            return response.payload.data.decode('UTF-8')
        else:
            raise ValueError(f"Unsupported cloud provider: {self.cloud_provider}")