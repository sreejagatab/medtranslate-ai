#!/usr/bin/env python3
"""
Model Optimization Script for MedTranslate AI Edge Application

This script optimizes translation models for edge devices by:
- Quantizing models to reduce size
- Converting to optimized formats (ONNX, CTranslate2)
- Pruning models for faster inference
"""

import os
import sys
import json
import time
import argparse
import logging
import shutil
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('optimize_model')

# Try to import optimization libraries
try:
    import torch
    import torch.quantization
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available, some optimizations will be skipped")

try:
    import onnx
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("ONNX Runtime not available, ONNX conversion will be skipped")

try:
    import ctranslate2
    CTRANSLATE2_AVAILABLE = True
except ImportError:
    CTRANSLATE2_AVAILABLE = False
    logger.warning("CTranslate2 not available, CTranslate2 conversion will be skipped")

try:
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available, model loading will be limited")

def optimize_model(
    model_path: str,
    output_path: str,
    compute_type: str = "int8",
    device: str = "cpu",
    verbose: bool = False
) -> bool:
    """
    Optimize a translation model for edge deployment
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        device: Device to use ('cpu', 'cuda')
        verbose: Whether to show verbose output
    
    Returns:
        Success indicator
    """
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    start_time = time.time()
    logger.info(f"Optimizing model from {model_path} to {output_path}")
    logger.info(f"Compute type: {compute_type}, Device: {device}")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_path, exist_ok=True)
    
    # Check if model path exists
    if not os.path.exists(model_path):
        logger.error(f"Model path {model_path} does not exist")
        return False
    
    # Determine model type
    model_type = detect_model_type(model_path)
    logger.info(f"Detected model type: {model_type}")
    
    # Copy tokenizer files
    copy_tokenizer_files(model_path, output_path)
    
    # Optimize based on model type and available libraries
    success = False
    
    if model_type == "huggingface" and TRANSFORMERS_AVAILABLE:
        if CTRANSLATE2_AVAILABLE:
            success = convert_to_ctranslate2(model_path, output_path, compute_type, device)
        elif ONNX_AVAILABLE:
            success = convert_to_onnx(model_path, output_path, compute_type, device)
        elif TORCH_AVAILABLE:
            success = quantize_pytorch_model(model_path, output_path, compute_type, device)
        else:
            logger.error("No optimization libraries available")
            # Copy original model as fallback
            success = copy_original_model(model_path, output_path)
    elif model_type == "ctranslate2" and CTRANSLATE2_AVAILABLE:
        # Already in CTranslate2 format, just copy and optimize if needed
        success = optimize_ctranslate2_model(model_path, output_path, compute_type, device)
    elif model_type == "onnx" and ONNX_AVAILABLE:
        # Already in ONNX format, just optimize if needed
        success = optimize_onnx_model(model_path, output_path, compute_type)
    else:
        logger.warning(f"Unsupported model type or missing libraries for {model_type}")
        # Copy original model as fallback
        success = copy_original_model(model_path, output_path)
    
    # Copy medical terminology
    copy_medical_terminology(model_path, output_path)
    
    # Create metadata file
    create_optimization_metadata(model_path, output_path, compute_type, device, model_type, success)
    
    end_time = time.time()
    logger.info(f"Optimization completed in {end_time - start_time:.2f} seconds")
    
    return success

def detect_model_type(model_path: str) -> str:
    """
    Detect the type of model
    
    Args:
        model_path: Path to the model
        
    Returns:
        Model type string
    """
    # Check for CTranslate2 model
    if os.path.exists(os.path.join(model_path, "model.bin")):
        return "ctranslate2"
    
    # Check for ONNX model
    if os.path.exists(os.path.join(model_path, "model.onnx")):
        return "onnx"
    
    # Check for Hugging Face model
    if os.path.exists(os.path.join(model_path, "config.json")):
        return "huggingface"
    
    # Default to unknown
    return "unknown"

def copy_tokenizer_files(model_path: str, output_path: str) -> None:
    """
    Copy tokenizer files from source to destination
    
    Args:
        model_path: Source model path
        output_path: Destination path
    """
    tokenizer_files = [
        "tokenizer.json",
        "tokenizer_config.json",
        "vocab.json",
        "merges.txt",
        "special_tokens_map.json"
    ]
    
    for file in tokenizer_files:
        src_file = os.path.join(model_path, file)
        if os.path.exists(src_file):
            dst_file = os.path.join(output_path, file)
            shutil.copy2(src_file, dst_file)
            logger.debug(f"Copied {file}")

def copy_medical_terminology(model_path: str, output_path: str) -> None:
    """
    Copy medical terminology files
    
    Args:
        model_path: Source model path
        output_path: Destination path
    """
    terminology_file = os.path.join(model_path, "medical_terms.json")
    if os.path.exists(terminology_file):
        dst_file = os.path.join(output_path, "medical_terms.json")
        shutil.copy2(terminology_file, dst_file)
        logger.info("Copied medical terminology")

def copy_original_model(model_path: str, output_path: str) -> bool:
    """
    Copy original model files as fallback
    
    Args:
        model_path: Source model path
        output_path: Destination path
        
    Returns:
        Success indicator
    """
    try:
        # Copy all files except directories
        for file in os.listdir(model_path):
            src_file = os.path.join(model_path, file)
            if os.path.isfile(src_file):
                dst_file = os.path.join(output_path, file)
                shutil.copy2(src_file, dst_file)
                logger.debug(f"Copied {file}")
        
        logger.info("Copied original model files as fallback")
        return True
    except Exception as e:
        logger.error(f"Error copying original model: {e}")
        return False

def convert_to_ctranslate2(
    model_path: str,
    output_path: str,
    compute_type: str = "int8",
    device: str = "cpu"
) -> bool:
    """
    Convert Hugging Face model to CTranslate2 format
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        device: Device to use ('cpu', 'cuda')
        
    Returns:
        Success indicator
    """
    try:
        logger.info("Converting to CTranslate2 format")
        
        # Map compute type to CTranslate2 format
        ct2_compute_type = {
            "int8": "int8",
            "fp16": "float16",
            "fp32": "float32"
        }.get(compute_type, "auto")
        
        # Convert model
        ctranslate2.converters.convert_from_pretrained(
            model_path,
            output_dir=output_path,
            quantization=ct2_compute_type,
            force=True
        )
        
        logger.info("Successfully converted to CTranslate2 format")
        return True
    except Exception as e:
        logger.error(f"Error converting to CTranslate2: {e}")
        return False

def convert_to_onnx(
    model_path: str,
    output_path: str,
    compute_type: str = "int8",
    device: str = "cpu"
) -> bool:
    """
    Convert Hugging Face model to ONNX format
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        device: Device to use ('cpu', 'cuda')
        
    Returns:
        Success indicator
    """
    try:
        logger.info("Converting to ONNX format")
        
        # Load tokenizer and model
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        
        # Move model to device
        torch_device = torch.device(device)
        model = model.to(torch_device)
        
        # Use half precision if requested
        if compute_type == "fp16" and device == "cuda":
            model = model.half()
        
        # Export to ONNX
        dummy_input = tokenizer("This is a test", return_tensors="pt").to(torch_device)
        torch.onnx.export(
            model,
            (dummy_input.input_ids, dummy_input.attention_mask),
            os.path.join(output_path, "model.onnx"),
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence_length"},
                "attention_mask": {0: "batch_size", 1: "sequence_length"},
                "logits": {0: "batch_size", 1: "sequence_length"}
            },
            opset_version=12
        )
        
        # Optimize ONNX model
        if compute_type == "int8":
            optimize_onnx_model(output_path, output_path, compute_type)
        
        logger.info("Successfully converted to ONNX format")
        return True
    except Exception as e:
        logger.error(f"Error converting to ONNX: {e}")
        return False

def optimize_onnx_model(
    model_path: str,
    output_path: str,
    compute_type: str = "int8"
) -> bool:
    """
    Optimize ONNX model
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        
    Returns:
        Success indicator
    """
    try:
        logger.info("Optimizing ONNX model")
        
        # Load ONNX model
        onnx_path = os.path.join(model_path, "model.onnx")
        if not os.path.exists(onnx_path):
            onnx_path = model_path
        
        model = onnx.load(onnx_path)
        
        # Optimize model
        from onnxruntime.transformers import optimizer
        optimized_model = optimizer.optimize_model(
            onnx_path,
            model_type="bert",
            num_heads=12,
            hidden_size=768
        )
        
        # Save optimized model
        optimized_model.save_model_to_file(os.path.join(output_path, "model.onnx"))
        
        logger.info("Successfully optimized ONNX model")
        return True
    except Exception as e:
        logger.error(f"Error optimizing ONNX model: {e}")
        return False

def optimize_ctranslate2_model(
    model_path: str,
    output_path: str,
    compute_type: str = "int8",
    device: str = "cpu"
) -> bool:
    """
    Optimize CTranslate2 model
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        device: Device to use ('cpu', 'cuda')
        
    Returns:
        Success indicator
    """
    try:
        logger.info("Optimizing CTranslate2 model")
        
        # Map compute type to CTranslate2 format
        ct2_compute_type = {
            "int8": "int8",
            "fp16": "float16",
            "fp32": "float32"
        }.get(compute_type, "auto")
        
        # Copy model files
        for file in os.listdir(model_path):
            src_file = os.path.join(model_path, file)
            if os.path.isfile(src_file):
                dst_file = os.path.join(output_path, file)
                shutil.copy2(src_file, dst_file)
        
        # Create converter config
        config_path = os.path.join(output_path, "config.json")
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                config = json.load(f)
            
            # Update config with optimization settings
            config["quantization"] = ct2_compute_type
            
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
        
        logger.info("Successfully optimized CTranslate2 model")
        return True
    except Exception as e:
        logger.error(f"Error optimizing CTranslate2 model: {e}")
        return False

def quantize_pytorch_model(
    model_path: str,
    output_path: str,
    compute_type: str = "int8",
    device: str = "cpu"
) -> bool:
    """
    Quantize PyTorch model
    
    Args:
        model_path: Path to the model
        output_path: Path to save the optimized model
        compute_type: Computation type ('int8', 'fp16', 'fp32')
        device: Device to use ('cpu', 'cuda')
        
    Returns:
        Success indicator
    """
    try:
        logger.info("Quantizing PyTorch model")
        
        # Load model
        model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        
        # Quantize model
        if compute_type == "int8" and device == "cpu":
            # Dynamic quantization
            quantized_model = torch.quantization.quantize_dynamic(
                model,
                {torch.nn.Linear},
                dtype=torch.qint8
            )
            
            # Save quantized model
            quantized_model.save_pretrained(output_path)
        elif compute_type == "fp16" and device == "cuda":
            # Half precision
            model = model.half()
            model.save_pretrained(output_path)
        else:
            # Just copy the model
            model.save_pretrained(output_path)
        
        logger.info("Successfully quantized PyTorch model")
        return True
    except Exception as e:
        logger.error(f"Error quantizing PyTorch model: {e}")
        return False

def create_optimization_metadata(
    model_path: str,
    output_path: str,
    compute_type: str,
    device: str,
    model_type: str,
    success: bool
) -> None:
    """
    Create metadata file for the optimized model
    
    Args:
        model_path: Source model path
        output_path: Destination path
        compute_type: Computation type used
        device: Device used
        model_type: Model type
        success: Whether optimization was successful
    """
    try:
        # Get original metadata if it exists
        metadata = {}
        metadata_path = os.path.join(model_path, "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
        
        # Add optimization metadata
        metadata["optimization"] = {
            "timestamp": time.time(),
            "compute_type": compute_type,
            "device": device,
            "model_type": model_type,
            "success": success,
            "version": "1.0"
        }
        
        # Save metadata
        with open(os.path.join(output_path, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.debug("Created optimization metadata")
    except Exception as e:
        logger.error(f"Error creating metadata: {e}")

def parse_arguments():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(description="Model Optimization for MedTranslate AI Edge")
    parser.add_argument("model_path", help="Path to the model")
    parser.add_argument("output_path", help="Path to save the optimized model")
    parser.add_argument("--compute_type", default="int8", choices=["int8", "fp16", "fp32"], help="Computation type")
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"], help="Device to use")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    return parser.parse_args()

def main():
    """Main function"""
    args = parse_arguments()
    
    success = optimize_model(
        args.model_path,
        args.output_path,
        args.compute_type,
        args.device,
        args.verbose
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
