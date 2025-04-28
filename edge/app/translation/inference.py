#!/usr/bin/env python3
"""
Inference script for MedTranslate AI Edge Application

This script performs translation inference using local models.
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any, Optional

# Try to import transformers
try:
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not available, using fallback implementation", file=sys.stderr)

# Medical terminology dictionary (sample)
MEDICAL_TERMS = {
    "en-es": {
        "heart attack": "ataque cardíaco",
        "blood pressure": "presión arterial",
        "diabetes": "diabetes",
        "stroke": "accidente cerebrovascular",
        "cancer": "cáncer",
        "hypertension": "hipertensión",
        "asthma": "asma"
    },
    "es-en": {
        "ataque cardíaco": "heart attack",
        "presión arterial": "blood pressure",
        "diabetes": "diabetes",
        "accidente cerebrovascular": "stroke",
        "cáncer": "cancer",
        "hipertensión": "hypertension",
        "asma": "asthma"
    },
    "en-fr": {
        "heart attack": "crise cardiaque",
        "blood pressure": "tension artérielle",
        "diabetes": "diabète",
        "stroke": "accident vasculaire cérébral",
        "cancer": "cancer",
        "hypertension": "hypertension",
        "asthma": "asthme"
    },
    "fr-en": {
        "crise cardiaque": "heart attack",
        "tension artérielle": "blood pressure",
        "diabète": "diabetes",
        "accident vasculaire cérébral": "stroke",
        "cancer": "cancer",
        "hypertension": "hypertension",
        "asthme": "asthma"
    }
}

def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Translation inference script")
    parser.add_argument("model_path", help="Path to the model")
    parser.add_argument("text", help="Text to translate")
    parser.add_argument("source_language", help="Source language code")
    parser.add_argument("target_language", help="Target language code")
    parser.add_argument("--context", default="general", help="Medical context")
    parser.add_argument("--max_length", type=int, default=512, help="Maximum output length")
    parser.add_argument("--device", default="cpu", help="Device to use (cpu or cuda)")
    return parser.parse_args()

def load_model(model_path: str, device: str = "cpu") -> Optional[Any]:
    """Load translation model"""
    if not TRANSFORMERS_AVAILABLE:
        return None
    
    try:
        # Check if model path exists
        if not os.path.exists(model_path):
            print(f"Error: Model path {model_path} does not exist", file=sys.stderr)
            return None
        
        # Check if model is ONNX
        if model_path.endswith(".onnx"):
            # Use ONNX Runtime for inference
            try:
                from transformers import AutoTokenizer
                import onnxruntime as ort
                
                # Get model directory
                model_dir = os.path.dirname(model_path)
                
                # Load tokenizer
                tokenizer = AutoTokenizer.from_pretrained(model_dir)
                
                # Create ONNX session
                ort_session = ort.InferenceSession(model_path)
                
                return {
                    "type": "onnx",
                    "session": ort_session,
                    "tokenizer": tokenizer
                }
            except ImportError:
                print("ONNX Runtime not available, falling back to PyTorch", file=sys.stderr)
        
        # Use Hugging Face Transformers
        model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        
        # Move model to device
        model = model.to(device)
        
        # Create translation pipeline
        translator = pipeline("translation", model=model, tokenizer=tokenizer, device=0 if device == "cuda" else -1)
        
        return {
            "type": "transformers",
            "pipeline": translator,
            "model": model,
            "tokenizer": tokenizer
        }
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        return None

def translate_with_model(
    model_data: Dict[str, Any],
    text: str,
    source_language: str,
    target_language: str,
    max_length: int = 512
) -> Dict[str, Any]:
    """Translate text using loaded model"""
    start_time = time.time()
    
    if not model_data or not TRANSFORMERS_AVAILABLE:
        # Fallback implementation
        result = fallback_translation(text, source_language, target_language)
        processing_time = time.time() - start_time
        return {
            "translatedText": result,
            "confidence": "low",
            "processingTime": processing_time
        }
    
    try:
        if model_data["type"] == "onnx":
            # ONNX inference
            tokenizer = model_data["tokenizer"]
            session = model_data["session"]
            
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
            confidence = 0.8  # Placeholder
        else:
            # Transformers pipeline
            translator = model_data["pipeline"]
            translation = translator(text, max_length=max_length)
            
            if isinstance(translation, list) and len(translation) > 0:
                translated_text = translation[0]["translation_text"]
                confidence = translation[0].get("score", 0.8)
            else:
                translated_text = translation["translation_text"]
                confidence = translation.get("score", 0.8)
        
        # Apply medical terminology corrections
        translated_text = apply_medical_terminology(
            translated_text, source_language, target_language
        )
        
        processing_time = time.time() - start_time
        
        return {
            "translatedText": translated_text,
            "confidence": "high" if confidence > 0.8 else "medium" if confidence > 0.6 else "low",
            "processingTime": processing_time
        }
    except Exception as e:
        print(f"Error during translation: {str(e)}", file=sys.stderr)
        # Fallback to basic translation
        result = fallback_translation(text, source_language, target_language)
        processing_time = time.time() - start_time
        return {
            "translatedText": result,
            "confidence": "low",
            "processingTime": processing_time
        }

def fallback_translation(text: str, source_language: str, target_language: str) -> str:
    """Fallback translation when model is not available"""
    # Check if we have medical terms for this language pair
    lang_pair = f"{source_language}-{target_language}"
    
    if lang_pair in MEDICAL_TERMS:
        # Replace known medical terms
        result = text
        for term, translation in MEDICAL_TERMS[lang_pair].items():
            result = result.replace(term, translation)
        return result
    
    # Very basic fallback
    return f"[{source_language}-{target_language} Translation] {text}"

def apply_medical_terminology(
    text: str, source_language: str, target_language: str
) -> str:
    """Apply medical terminology corrections to translated text"""
    lang_pair = f"{source_language}-{target_language}"
    
    if lang_pair in MEDICAL_TERMS:
        result = text
        for term, translation in MEDICAL_TERMS[lang_pair].items():
            # Case-insensitive replacement
            lower_text = result.lower()
            lower_term = term.lower()
            
            if lower_term in lower_text:
                # Find all occurrences with original casing
                start = 0
                while True:
                    pos = lower_text.find(lower_term, start)
                    if pos == -1:
                        break
                    
                    # Replace with medical term
                    result = result[:pos] + translation + result[pos + len(term):]
                    lower_text = result.lower()
                    start = pos + len(translation)
        
        return result
    
    return text

def main() -> None:
    """Main function"""
    args = parse_arguments()
    
    # Load model
    model_data = load_model(args.model_path, args.device)
    
    # Translate text
    result = translate_with_model(
        model_data,
        args.text,
        args.source_language,
        args.target_language,
        args.max_length
    )
    
    # Output result as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()
