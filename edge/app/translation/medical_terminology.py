#!/usr/bin/env python3
"""
Medical Terminology Module for MedTranslate AI Edge Application

This module provides functions for handling medical terminology in translations,
including loading terminology dictionaries, applying terminology to translations,
and handling context-specific medical terms.
"""

import os
import json
import re
import logging
from typing import Dict, Any, List, Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('medical_terminology')

# Global terminology cache
TERMINOLOGY_CACHE = {}

def load_terminology(
    source_language: str,
    target_language: str,
    terminology_path: Optional[str] = None
) -> Dict[str, str]:
    """
    Load medical terminology dictionary for a language pair
    
    Args:
        source_language: Source language code
        target_language: Target language code
        terminology_path: Optional path to terminology file
        
    Returns:
        Dictionary mapping source terms to target terms
    """
    # Check cache first
    cache_key = f"{source_language}-{target_language}"
    if cache_key in TERMINOLOGY_CACHE:
        return TERMINOLOGY_CACHE[cache_key]
    
    terminology = {}
    
    # Try to load from specified path
    if terminology_path and os.path.exists(terminology_path):
        try:
            with open(terminology_path, 'r', encoding='utf-8') as f:
                terminology = json.load(f)
            logger.info(f"Loaded {len(terminology)} terms from {terminology_path}")
        except Exception as e:
            logger.error(f"Error loading terminology from {terminology_path}: {e}")
    
    # Try to load from default locations if not found
    if not terminology:
        # Try model directory
        model_dir = os.environ.get('MODEL_DIR', '../../models')
        default_path = os.path.join(model_dir, f"{source_language}-{target_language}", "medical_terms.json")
        
        if os.path.exists(default_path):
            try:
                with open(default_path, 'r', encoding='utf-8') as f:
                    terminology = json.load(f)
                logger.info(f"Loaded {len(terminology)} terms from {default_path}")
            except Exception as e:
                logger.error(f"Error loading terminology from {default_path}: {e}")
    
    # Cache the terminology
    TERMINOLOGY_CACHE[cache_key] = terminology
    
    return terminology

def filter_terminology_by_context(
    terminology: Dict[str, Any],
    medical_context: str
) -> Dict[str, str]:
    """
    Filter terminology dictionary by medical context
    
    Args:
        terminology: Full terminology dictionary
        medical_context: Medical context to filter by
        
    Returns:
        Filtered terminology dictionary
    """
    # If terminology is already a simple mapping, return as is
    if all(isinstance(v, str) for v in terminology.values()):
        return terminology
    
    # If terminology has context information, filter by context
    filtered = {}
    
    for term, data in terminology.items():
        # Handle different terminology formats
        if isinstance(data, str):
            # Simple format: term -> translation
            filtered[term] = data
        elif isinstance(data, dict):
            # Complex format: term -> {context: translation, ...}
            if medical_context in data:
                filtered[term] = data[medical_context]
            elif "general" in data:
                filtered[term] = data["general"]
            elif "translation" in data:
                filtered[term] = data["translation"]
        elif isinstance(data, list) and len(data) > 0:
            # List format: term -> [{context, translation}, ...]
            for item in data:
                if isinstance(item, dict) and item.get("context") == medical_context:
                    filtered[term] = item.get("translation", "")
                    break
            # If no matching context found, use first item
            if term not in filtered and len(data) > 0 and isinstance(data[0], dict):
                filtered[term] = data[0].get("translation", "")
    
    return filtered

def apply_medical_terminology(
    text: str,
    source_language: str,
    target_language: str,
    medical_context: str = "general",
    terminology_path: Optional[str] = None
) -> str:
    """
    Apply medical terminology corrections to translated text
    
    Args:
        text: Text to process
        source_language: Source language code
        target_language: Target language code
        medical_context: Medical context
        terminology_path: Optional path to terminology file
        
    Returns:
        Processed text with terminology corrections
    """
    # Load terminology
    terminology = load_terminology(source_language, target_language, terminology_path)
    
    # If no terminology available, return original text
    if not terminology:
        return text
    
    # Filter terminology by context
    filtered_terminology = filter_terminology_by_context(terminology, medical_context)
    
    # Apply terminology corrections
    processed_text = text
    
    # First handle multi-word terms (longest first to avoid partial matches)
    multi_word_terms = sorted(
        [term for term in filtered_terminology.keys() if ' ' in term],
        key=len,
        reverse=True
    )
    
    for term in multi_word_terms:
        translation = filtered_terminology[term]
        # Create regex to match the term with word boundaries
        try:
            # Escape special regex characters
            escaped_term = re.escape(term)
            term_pattern = r'\b' + escaped_term + r'\b'
            
            # Replace term in text (case-insensitive)
            processed_text = re.sub(
                term_pattern,
                translation,
                processed_text,
                flags=re.IGNORECASE
            )
        except Exception as e:
            logger.error(f"Error applying terminology for term '{term}': {e}")
    
    # Then handle single-word terms
    single_word_terms = sorted(
        [term for term in filtered_terminology.keys() if ' ' not in term],
        key=len,
        reverse=True
    )
    
    for term in single_word_terms:
        translation = filtered_terminology[term]
        try:
            # Escape special regex characters
            escaped_term = re.escape(term)
            term_pattern = r'\b' + escaped_term + r'\b'
            
            # Replace term in text (case-insensitive)
            processed_text = re.sub(
                term_pattern,
                translation,
                processed_text,
                flags=re.IGNORECASE
            )
        except Exception as e:
            logger.error(f"Error applying terminology for term '{term}': {e}")
    
    return processed_text

def extract_medical_terms(
    text: str,
    source_language: str,
    medical_context: str = "general"
) -> List[str]:
    """
    Extract potential medical terms from text
    
    Args:
        text: Text to analyze
        source_language: Source language code
        medical_context: Medical context
        
    Returns:
        List of potential medical terms
    """
    # Load terminology for this language
    terminology = load_terminology(source_language, "en")
    
    # Extract terms that appear in the terminology
    extracted_terms = []
    
    # Check for multi-word terms first
    multi_word_terms = [term for term in terminology.keys() if ' ' in term]
    
    for term in multi_word_terms:
        try:
            # Escape special regex characters
            escaped_term = re.escape(term)
            term_pattern = r'\b' + escaped_term + r'\b'
            
            # Check if term appears in text
            if re.search(term_pattern, text, re.IGNORECASE):
                extracted_terms.append(term)
        except Exception as e:
            logger.error(f"Error extracting term '{term}': {e}")
    
    # Then check for single-word terms
    single_word_terms = [term for term in terminology.keys() if ' ' not in term]
    
    for term in single_word_terms:
        try:
            # Escape special regex characters
            escaped_term = re.escape(term)
            term_pattern = r'\b' + escaped_term + r'\b'
            
            # Check if term appears in text
            if re.search(term_pattern, text, re.IGNORECASE):
                extracted_terms.append(term)
        except Exception as e:
            logger.error(f"Error extracting term '{term}': {e}")
    
    return extracted_terms

def verify_terminology_translation(
    source_text: str,
    translated_text: str,
    source_language: str,
    target_language: str,
    medical_context: str = "general"
) -> List[Dict[str, Any]]:
    """
    Verify if medical terms were correctly translated
    
    Args:
        source_text: Original text
        translated_text: Translated text
        source_language: Source language code
        target_language: Target language code
        medical_context: Medical context
        
    Returns:
        List of verification results for each term
    """
    # Extract medical terms from source text
    source_terms = extract_medical_terms(source_text, source_language, medical_context)
    
    # Load terminology
    terminology = load_terminology(source_language, target_language)
    filtered_terminology = filter_terminology_by_context(terminology, medical_context)
    
    # Check each term
    verification_results = []
    
    for term in source_terms:
        if term in filtered_terminology:
            expected_translation = filtered_terminology[term]
            
            # Check if expected translation appears in translated text
            term_found = False
            try:
                # Escape special regex characters
                escaped_translation = re.escape(expected_translation)
                translation_pattern = r'\b' + escaped_translation + r'\b'
                
                # Check if translation appears in text
                term_found = re.search(translation_pattern, translated_text, re.IGNORECASE) is not None
            except Exception:
                # Fallback to simple string search if regex fails
                term_found = expected_translation.lower() in translated_text.lower()
            
            verification_results.append({
                "term": term,
                "expected_translation": expected_translation,
                "found": term_found,
                "confidence": "high" if term_found else "low"
            })
    
    return verification_results

# Command-line interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Medical Terminology Module")
    parser.add_argument("text", help="Text to process")
    parser.add_argument("source_language", help="Source language code")
    parser.add_argument("target_language", help="Target language code")
    parser.add_argument("--context", default="general", help="Medical context")
    parser.add_argument("--terminology", help="Path to terminology file")
    
    args = parser.parse_args()
    
    # Apply terminology
    result = apply_medical_terminology(
        args.text,
        args.source_language,
        args.target_language,
        args.context,
        args.terminology
    )
    
    print(f"Original: {args.text}")
    print(f"Processed: {result}")
