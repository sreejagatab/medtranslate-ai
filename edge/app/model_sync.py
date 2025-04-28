#!/usr/bin/env python3
"""
MedTranslate AI Edge Model Synchronization

This script handles model synchronization between the edge device
and the cloud, ensuring models are up-to-date.
"""

import os
import sys
import json
import time
import hashlib
import argparse
import logging
import requests
import boto3
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/medtranslate/model_sync.log')
    ]
)
logger = logging.getLogger('model_sync')

# Default paths
DEFAULT_MODEL_DIR = os.environ.get('MODEL_DIR', '/models')
DEFAULT_CONFIG_DIR = os.environ.get('CONFIG_DIR', '/config')
DEFAULT_MANIFEST_FILE = os.path.join(DEFAULT_CONFIG_DIR, 'model_manifest.json')
DEFAULT_API_URL = os.environ.get('CLOUD_API_URL', 'https://api.medtranslate.ai')


class ModelSynchronizer:
    """Model synchronization for edge deployment"""
    
    def __init__(self, model_dir: str, manifest_file: str, api_url: str):
        """
        Initialize the model synchronizer
        
        Args:
            model_dir: Directory to store models
            manifest_file: Path to the model manifest file
            api_url: URL of the cloud API
        """
        self.model_dir = model_dir
        self.manifest_file = manifest_file
        self.api_url = api_url
        
        # Create directories if they don't exist
        os.makedirs(model_dir, exist_ok=True)
        os.makedirs(os.path.dirname(manifest_file), exist_ok=True)
        
        # Load manifest if it exists
        self.manifest = self._load_manifest()
        
        # Initialize AWS S3 client if credentials are available
        self.s3_client = self._init_s3_client()
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load model manifest from file"""
        if os.path.exists(self.manifest_file):
            try:
                with open(self.manifest_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading manifest: {e}")
        
        # Return empty manifest if file doesn't exist or is invalid
        return {
            "models": {},
            "last_sync": None,
            "device_id": os.environ.get('DEVICE_ID', 'unknown')
        }
    
    def _save_manifest(self):
        """Save model manifest to file"""
        try:
            with open(self.manifest_file, 'w') as f:
                json.dump(self.manifest, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving manifest: {e}")
    
    def _init_s3_client(self):
        """Initialize AWS S3 client"""
        try:
            return boto3.client('s3')
        except Exception as e:
            logger.warning(f"Failed to initialize S3 client: {e}")
            return None
    
    def get_current_models(self) -> Dict[str, Dict[str, Any]]:
        """
        Get information about currently installed models
        
        Returns:
            Dictionary of model information
        """
        current_models = {}
        
        # Scan model directory
        for filename in os.listdir(self.model_dir):
            if filename.endswith('.bin'):
                model_path = os.path.join(self.model_dir, filename)
                model_info = self._get_model_info(filename, model_path)
                current_models[filename] = model_info
        
        return current_models
    
    def _get_model_info(self, filename: str, model_path: str) -> Dict[str, Any]:
        """Get information about a model file"""
        try:
            # Get file stats
            stats = os.stat(model_path)
            
            # Calculate MD5 hash (for large files, read in chunks)
            md5_hash = hashlib.md5()
            with open(model_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    md5_hash.update(chunk)
            
            # Parse language pair from filename
            language_pair = filename.split('.')[0]
            source_lang, target_lang = language_pair.split('-')
            
            return {
                "filename": filename,
                "size": stats.st_size,
                "modified": stats.st_mtime,
                "md5": md5_hash.hexdigest(),
                "source_language": source_lang,
                "target_language": target_lang
            }
        except Exception as e:
            logger.error(f"Error getting model info for {filename}: {e}")
            return {
                "filename": filename,
                "size": 0,
                "modified": 0,
                "md5": "",
                "error": str(e)
            }
    
    def check_for_updates(self) -> Dict[str, Any]:
        """
        Check for model updates from the cloud
        
        Returns:
            Dictionary with update information
        """
        try:
            # Get current models
            current_models = self.get_current_models()
            
            # Update manifest with current models
            self.manifest["models"] = current_models
            
            # Prepare request data
            request_data = {
                "device_id": self.manifest["device_id"],
                "current_models": current_models,
                "last_sync": self.manifest["last_sync"]
            }
            
            # Call API to check for updates
            response = requests.post(
                f"{self.api_url}/models/check-updates",
                json=request_data,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"API error: {response.status_code}"}
            
            # Parse response
            update_info = response.json()
            
            # Update last sync time
            self.manifest["last_sync"] = time.time()
            self._save_manifest()
            
            return update_info
        
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return {"success": False, "error": str(e)}
    
    def download_model(self, model_info: Dict[str, Any]) -> bool:
        """
        Download a model from the cloud
        
        Args:
            model_info: Information about the model to download
            
        Returns:
            True if download was successful, False otherwise
        """
        try:
            filename = model_info["filename"]
            download_url = model_info["download_url"]
            expected_size = model_info["size"]
            expected_md5 = model_info.get("md5", "")
            
            logger.info(f"Downloading model: {filename} ({expected_size} bytes)")
            
            # Determine download method
            if download_url.startswith('s3://') and self.s3_client:
                success = self._download_from_s3(download_url, filename)
            else:
                success = self._download_from_http(download_url, filename)
            
            if success:
                # Verify download
                model_path = os.path.join(self.model_dir, filename)
                if os.path.exists(model_path):
                    actual_size = os.path.getsize(model_path)
                    
                    # Verify size
                    if actual_size != expected_size:
                        logger.error(f"Size mismatch: expected {expected_size}, got {actual_size}")
                        return False
                    
                    # Verify MD5 if provided
                    if expected_md5:
                        md5_hash = hashlib.md5()
                        with open(model_path, 'rb') as f:
                            for chunk in iter(lambda: f.read(4096), b''):
                                md5_hash.update(chunk)
                        
                        actual_md5 = md5_hash.hexdigest()
                        if actual_md5 != expected_md5:
                            logger.error(f"MD5 mismatch: expected {expected_md5}, got {actual_md5}")
                            return False
                    
                    # Update manifest
                    self.manifest["models"][filename] = self._get_model_info(filename, model_path)
                    self._save_manifest()
                    
                    logger.info(f"Successfully downloaded and verified model: {filename}")
                    return True
                else:
                    logger.error(f"Downloaded file not found: {model_path}")
                    return False
            else:
                return False
        
        except Exception as e:
            logger.error(f"Error downloading model {model_info['filename']}: {e}")
            return False
    
    def _download_from_s3(self, s3_url: str, filename: str) -> bool:
        """Download a model from S3"""
        try:
            # Parse S3 URL
            s3_url = s3_url.replace('s3://', '')
            bucket_name, key = s3_url.split('/', 1)
            
            # Download file
            output_path = os.path.join(self.model_dir, filename)
            self.s3_client.download_file(bucket_name, key, output_path)
            
            return True
        
        except Exception as e:
            logger.error(f"Error downloading from S3: {e}")
            return False
    
    def _download_from_http(self, url: str, filename: str) -> bool:
        """Download a model from HTTP/HTTPS"""
        try:
            # Download file
            output_path = os.path.join(self.model_dir, filename)
            
            with requests.get(url, stream=True, timeout=300) as response:
                response.raise_for_status()
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            return True
        
        except Exception as e:
            logger.error(f"Error downloading from HTTP: {e}")
            return False
    
    def sync_models(self) -> Dict[str, Any]:
        """
        Synchronize models with the cloud
        
        Returns:
            Dictionary with synchronization results
        """
        try:
            # Check for updates
            update_info = self.check_for_updates()
            
            if not update_info.get("success", False):
                return update_info
            
            # Get models to download
            models_to_download = update_info.get("updates", [])
            
            if not models_to_download:
                logger.info("No model updates available")
                return {"success": True, "message": "No updates available"}
            
            # Download models
            results = {
                "success": True,
                "downloaded": [],
                "failed": []
            }
            
            for model_info in models_to_download:
                if self.download_model(model_info):
                    results["downloaded"].append(model_info["filename"])
                else:
                    results["failed"].append(model_info["filename"])
                    results["success"] = False
            
            # Log results
            logger.info(f"Sync completed. Downloaded: {len(results['downloaded'])}, Failed: {len(results['failed'])}")
            
            return results
        
        except Exception as e:
            logger.error(f"Error syncing models: {e}")
            return {"success": False, "error": str(e)}


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description="MedTranslate AI Edge Model Synchronization")
    parser.add_argument("--model-dir", default=DEFAULT_MODEL_DIR, help="Directory to store models")
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST_FILE, help="Path to model manifest file")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="URL of the cloud API")
    parser.add_argument("--check-only", action="store_true", help="Only check for updates, don't download")
    
    args = parser.parse_args()
    
    try:
        # Initialize synchronizer
        synchronizer = ModelSynchronizer(args.model_dir, args.manifest, args.api_url)
        
        if args.check_only:
            # Check for updates
            update_info = synchronizer.check_for_updates()
            print(json.dumps(update_info, indent=2))
        else:
            # Sync models
            result = synchronizer.sync_models()
            print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Error in model sync: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
