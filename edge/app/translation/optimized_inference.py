#!/usr/bin/env python3
"""
Optimized Inference Engine for MedTranslate AI Edge Application

This module provides an optimized inference engine for edge devices with:
- Model quantization for reduced size
- Batched inference for improved throughput
- Memory-efficient processing
- Adaptive model loading based on device capabilities
- Fallback mechanisms for resource-constrained environments
"""

import os
import sys
import json
import time
import argparse
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('optimized_inference')

# Try to import optimized libraries
try:
    import torch
    import torch.quantization
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available, using fallback implementation")

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("ONNX Runtime not available")

try:
    import ctranslate2
    CTRANSLATE2_AVAILABLE = True
except ImportError:
    CTRANSLATE2_AVAILABLE = False
    logger.warning("CTranslate2 not available")

# Medical terminology handling
from medical_terminology import apply_medical_terminology

# Device capabilities detection
def detect_device_capabilities() -> Dict[str, Any]:
    """
    Detect device capabilities to determine optimal inference settings
    
    Returns:
        Dict with device capabilities information
    """
    capabilities = {
        "cpu_count": os.cpu_count() or 1,
        "memory_gb": 0,
        "has_gpu": False,
        "gpu_memory_gb": 0,
        "supports_int8": False,
        "supports_fp16": False,
        "optimal_batch_size": 1,
        "recommended_engine": "fallback"
    }
    
    # Detect available memory
    try:
        import psutil
        mem = psutil.virtual_memory()
        capabilities["memory_gb"] = mem.total / (1024 * 1024 * 1024)
    except ImportError:
        logger.warning("psutil not available, cannot detect memory")
    
    # Detect GPU
    if TORCH_AVAILABLE:
        capabilities["has_gpu"] = torch.cuda.is_available()
        if capabilities["has_gpu"]:
            capabilities["gpu_count"] = torch.cuda.device_count()
            capabilities["gpu_memory_gb"] = torch.cuda.get_device_properties(0).total_memory / (1024 * 1024 * 1024)
            capabilities["supports_fp16"] = torch.cuda.is_available() and torch.cuda.get_device_capability()[0] >= 7
    
    # Determine optimal engine
    if CTRANSLATE2_AVAILABLE:
        capabilities["recommended_engine"] = "ctranslate2"
    elif ONNX_AVAILABLE:
        capabilities["recommended_engine"] = "onnx"
    elif TORCH_AVAILABLE:
        capabilities["recommended_engine"] = "pytorch"
    
    # Determine optimal batch size based on memory
    if capabilities["memory_gb"] > 8:
        capabilities["optimal_batch_size"] = 8
    elif capabilities["memory_gb"] > 4:
        capabilities["optimal_batch_size"] = 4
    elif capabilities["memory_gb"] > 2:
        capabilities["optimal_batch_size"] = 2
    
    # Check for quantization support
    if TORCH_AVAILABLE:
        capabilities["supports_int8"] = True
    
    logger.info(f"Detected device capabilities: {capabilities}")
    return capabilities

# Model loading with automatic optimization
def load_optimized_model(
    model_path: str,
    source_language: str,
    target_language: str,
    device: str = "auto",
    compute_type: str = "auto"
) -> Dict[str, Any]:
    """
    Load and optimize translation model based on device capabilities
    
    Args:
        model_path: Path to the model
        source_language: Source language code
        target_language: Target language code
        device: Device to use ('cpu', 'cuda', or 'auto')
        compute_type: Computation type ('int8', 'fp16', 'fp32', or 'auto')
    
    Returns:
        Dictionary with loaded model and metadata
    """
    start_time = time.time()
    
    # Detect device capabilities
    capabilities = detect_device_capabilities()
    
    # Determine device to use
    if device == "auto":
        device = "cuda" if capabilities["has_gpu"] else "cpu"
    
    # Determine compute type
    if compute_type == "auto":
        if device == "cuda" and capabilities["supports_fp16"]:
            compute_type = "fp16"
        elif capabilities["supports_int8"]:
            compute_type = "int8"
        else:
            compute_type = "fp32"
    
    logger.info(f"Loading model with device={device}, compute_type={compute_type}")
    
    # Check if model path exists
    if not os.path.exists(model_path):
        logger.error(f"Model path {model_path} does not exist")
        return None
    
    # Try different model loading strategies based on available libraries
    model_data = None
    
    # 1. Try CTranslate2 (fastest)
    if CTRANSLATE2_AVAILABLE and capabilities["recommended_engine"] == "ctranslate2":
        try:
            # Check if this is a CTranslate2 model
            if os.path.exists(os.path.join(model_path, "model.bin")):
                logger.info("Loading with CTranslate2")
                
                # Map compute type to CTranslate2 format
                ct2_compute_type = {
                    "int8": "int8",
                    "fp16": "float16",
                    "fp32": "float32"
                }.get(compute_type, "auto")
                
                # Load tokenizer
                from transformers import AutoTokenizer
                tokenizer_path = os.path.dirname(model_path)
                tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
                
                # Load translator
                translator = ctranslate2.Translator(
                    model_path,
                    device=device,
                    compute_type=ct2_compute_type,
                    inter_threads=min(4, capabilities["cpu_count"]),
                    intra_threads=min(4, capabilities["cpu_count"])
                )
                
                model_data = {
                    "type": "ctranslate2",
                    "translator": translator,
                    "tokenizer": tokenizer,
                    "source_language": source_language,
                    "target_language": target_language,
                    "device": device,
                    "compute_type": compute_type,
                    "batch_size": capabilities["optimal_batch_size"]
                }
                
                logger.info("Successfully loaded model with CTranslate2")
        except Exception as e:
            logger.error(f"Error loading with CTranslate2: {e}")
    
    # 2. Try ONNX Runtime
    if model_data is None and ONNX_AVAILABLE:
        try:
            # Check if this is an ONNX model
            if model_path.endswith(".onnx") or os.path.exists(os.path.join(model_path, "model.onnx")):
                logger.info("Loading with ONNX Runtime")
                
                # Determine ONNX model path
                onnx_path = model_path
                if not model_path.endswith(".onnx"):
                    onnx_path = os.path.join(model_path, "model.onnx")
                
                # Set execution providers
                providers = ['CPUExecutionProvider']
                if device == "cuda" and "CUDAExecutionProvider" in ort.get_available_providers():
                    providers.insert(0, "CUDAExecutionProvider")
                
                # Create ONNX session
                session_options = ort.SessionOptions()
                session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                session_options.intra_op_num_threads = min(4, capabilities["cpu_count"])
                session = ort.InferenceSession(onnx_path, sess_options=session_options, providers=providers)
                
                # Load tokenizer
                from transformers import AutoTokenizer
                tokenizer_path = os.path.dirname(model_path)
                tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
                
                model_data = {
                    "type": "onnx",
                    "session": session,
                    "tokenizer": tokenizer,
                    "source_language": source_language,
                    "target_language": target_language,
                    "device": device,
                    "compute_type": compute_type,
                    "batch_size": capabilities["optimal_batch_size"]
                }
                
                logger.info("Successfully loaded model with ONNX Runtime")
        except Exception as e:
            logger.error(f"Error loading with ONNX Runtime: {e}")
    
    # 3. Try PyTorch
    if model_data is None and TORCH_AVAILABLE:
        try:
            logger.info("Loading with PyTorch")
            
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
            
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            
            # Load model with quantization if needed
            if compute_type == "int8" and device == "cpu":
                # Quantized model for CPU
                model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
                model = torch.quantization.quantize_dynamic(
                    model, {torch.nn.Linear}, dtype=torch.qint8
                )
            else:
                # Regular model
                model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
            
            # Move model to device
            torch_device = torch.device(device)
            model = model.to(torch_device)
            
            # Use half precision if requested
            if compute_type == "fp16" and device == "cuda":
                model = model.half()
            
            # Create translation pipeline
            translator = pipeline(
                "translation", 
                model=model, 
                tokenizer=tokenizer, 
                device=0 if device == "cuda" else -1
            )
            
            model_data = {
                "type": "pytorch",
                "pipeline": translator,
                "model": model,
                "tokenizer": tokenizer,
                "source_language": source_language,
                "target_language": target_language,
                "device": device,
                "compute_type": compute_type,
                "batch_size": capabilities["optimal_batch_size"]
            }
            
            logger.info("Successfully loaded model with PyTorch")
        except Exception as e:
            logger.error(f"Error loading with PyTorch: {e}")
    
    # 4. Fallback to basic implementation
    if model_data is None:
        logger.warning("Using fallback implementation")
        
        # Load medical terminology for basic translation
        terminology_path = os.path.join(os.path.dirname(model_path), "medical_terms.json")
        terminology = {}
        
        if os.path.exists(terminology_path):
            try:
                with open(terminology_path, 'r', encoding='utf-8') as f:
                    terminology = json.load(f)
                logger.info(f"Loaded {len(terminology)} medical terms from {terminology_path}")
            except Exception as e:
                logger.error(f"Error loading medical terminology: {e}")
        
        model_data = {
            "type": "fallback",
            "terminology": terminology,
            "source_language": source_language,
            "target_language": target_language,
            "device": "cpu",
            "compute_type": "none",
            "batch_size": 1
        }
    
    # Record loading time
    loading_time = time.time() - start_time
    model_data["loading_time"] = loading_time
    
    logger.info(f"Model loaded in {loading_time:.2f} seconds")
    return model_data

# Optimized translation function
def translate_text(
    model_data: Dict[str, Any],
    text: str,
    source_language: str = None,
    target_language: str = None,
    medical_context: str = "general",
    max_length: int = 512
) -> Dict[str, Any]:
    """
    Translate text using the optimized model
    
    Args:
        model_data: Loaded model data
        text: Text to translate
        source_language: Source language code (optional, can be inferred from model_data)
        target_language: Target language code (optional, can be inferred from model_data)
        medical_context: Medical context for terminology handling
        max_length: Maximum output length
    
    Returns:
        Dictionary with translation results
    """
    if not model_data:
        return {
            "translatedText": text,
            "confidence": "low",
            "processingTime": 0,
            "engine": "none"
        }
    
    # Use language codes from model_data if not provided
    source_language = source_language or model_data.get("source_language")
    target_language = target_language or model_data.get("target_language")
    
    # Start timing
    start_time = time.time()
    
    # Translate based on model type
    if model_data["type"] == "ctranslate2":
        result = translate_with_ctranslate2(model_data, text, max_length)
    elif model_data["type"] == "onnx":
        result = translate_with_onnx(model_data, text, max_length)
    elif model_data["type"] == "pytorch":
        result = translate_with_pytorch(model_data, text, max_length)
    else:
        result = translate_with_fallback(model_data, text, source_language, target_language)
    
    # Apply medical terminology corrections
    translated_text = apply_medical_terminology(
        result["translatedText"],
        source_language,
        target_language,
        medical_context
    )
    
    # Calculate processing time
    processing_time = time.time() - start_time
    
    return {
        "translatedText": translated_text,
        "confidence": result.get("confidence", "medium"),
        "processingTime": processing_time,
        "engine": model_data["type"],
        "device": model_data["device"],
        "computeType": model_data["compute_type"]
    }

# Translation with CTranslate2
def translate_with_ctranslate2(
    model_data: Dict[str, Any],
    text: str,
    max_length: int = 512
) -> Dict[str, Any]:
    """Translate text using CTranslate2"""
    translator = model_data["translator"]
    tokenizer = model_data["tokenizer"]
    
    # Tokenize input
    source = tokenizer.encode(text, return_tensors=None)
    
    # Translate
    results = translator.translate_batch(
        [source],
        max_batch_size=model_data["batch_size"],
        max_length=max_length,
        beam_size=4
    )
    
    # Get best translation
    target = results[0][0]["tokens"]
    
    # Decode output
    translated_text = tokenizer.decode(target, skip_special_tokens=True)
    
    # Calculate confidence (use score if available)
    confidence = results[0][0].get("score", 0.8)
    confidence_level = "high" if confidence > 0.8 else "medium" if confidence > 0.6 else "low"
    
    return {
        "translatedText": translated_text,
        "confidence": confidence_level
    }

# Translation with ONNX Runtime
def translate_with_onnx(
    model_data: Dict[str, Any],
    text: str,
    max_length: int = 512
) -> Dict[str, Any]:
    """Translate text using ONNX Runtime"""
    session = model_data["session"]
    tokenizer = model_data["tokenizer"]
    
    # Tokenize input
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    
    # Run inference
    ort_inputs = {
        "input_ids": inputs["input_ids"].numpy(),
        "attention_mask": inputs["attention_mask"].numpy()
    }
    ort_outputs = session.run(None, ort_inputs)
    
    # Decode output
    translated_text = tokenizer.decode(ort_outputs[0][0], skip_special_tokens=True)
    
    return {
        "translatedText": translated_text,
        "confidence": "medium"  # ONNX doesn't provide confidence scores
    }

# Translation with PyTorch
def translate_with_pytorch(
    model_data: Dict[str, Any],
    text: str,
    max_length: int = 512
) -> Dict[str, Any]:
    """Translate text using PyTorch"""
    translator = model_data["pipeline"]
    
    # Translate
    translation = translator(text, max_length=max_length)
    
    # Extract result
    if isinstance(translation, list) and len(translation) > 0:
        translated_text = translation[0]["translation_text"]
        confidence = translation[0].get("score", 0.8)
    else:
        translated_text = translation["translation_text"]
        confidence = translation.get("score", 0.8)
    
    # Convert confidence to level
    confidence_level = "high" if confidence > 0.8 else "medium" if confidence > 0.6 else "low"
    
    return {
        "translatedText": translated_text,
        "confidence": confidence_level
    }

# Fallback translation
def translate_with_fallback(
    model_data: Dict[str, Any],
    text: str,
    source_language: str,
    target_language: str
) -> Dict[str, Any]:
    """Fallback translation using terminology dictionary"""
    terminology = model_data.get("terminology", {})
    
    if not terminology:
        return {
            "translatedText": f"[Translation from {source_language} to {target_language} not available in offline mode]",
            "confidence": "low"
        }
    
    # Simple word-by-word translation
    words = text.split()
    translated_words = []
    
    for word in words:
        word_lower = word.lower()
        if word_lower in terminology:
            translated_words.append(terminology[word_lower])
        else:
            # Keep original word
            translated_words.append(word)
    
    translated_text = " ".join(translated_words)
    
    return {
        "translatedText": translated_text,
        "confidence": "low"
    }

# Command-line interface
def parse_arguments():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(description="Optimized Inference for MedTranslate AI Edge")
    parser.add_argument("model_path", help="Path to the translation model")
    parser.add_argument("text", help="Text to translate")
    parser.add_argument("source_language", help="Source language code")
    parser.add_argument("target_language", help="Target language code")
    parser.add_argument("--context", default="general", help="Medical context")
    parser.add_argument("--device", default="auto", help="Device to use (cpu, cuda, or auto)")
    parser.add_argument("--compute_type", default="auto", help="Compute type (int8, fp16, fp32, or auto)")
    parser.add_argument("--max_length", type=int, default=512, help="Maximum output length")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    return parser.parse_args()

# Main function
def main():
    """Main function for command-line usage"""
    args = parse_arguments()
    
    # Set logging level
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    try:
        # Load model
        model_data = load_optimized_model(
            args.model_path,
            args.source_language,
            args.target_language,
            args.device,
            args.compute_type
        )
        
        # Translate text
        result = translate_text(
            model_data,
            args.text,
            args.source_language,
            args.target_language,
            args.context,
            args.max_length
        )
        
        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"Error during translation: {e}")
        print(json.dumps({
            "error": str(e),
            "translatedText": args.text,
            "confidence": "none"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
