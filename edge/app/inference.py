#!/usr/bin/env python3
"""
MedTranslate AI Edge Mock Inference Script for Testing

This script provides a mock implementation of the inference functionality
for testing without requiring the actual ML libraries.
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any

# Medical terminology dictionary for common terms
MEDICAL_TERMS = {
    'en': {
        'cardiology': {
            'heart attack': {'es': 'ataque cardíaco', 'fr': 'crise cardiaque', 'de': 'Herzinfarkt'},
            'blood pressure': {'es': 'presión arterial', 'fr': 'pression artérielle', 'de': 'Blutdruck'},
            'arrhythmia': {'es': 'arritmia', 'fr': 'arythmie', 'de': 'Arrhythmie'}
        },
        'general': {
            'fever': {'es': 'fiebre', 'fr': 'fièvre', 'de': 'Fieber'},
            'headache': {'es': 'dolor de cabeza', 'fr': 'mal de tête', 'de': 'Kopfschmerzen'},
            'nausea': {'es': 'náusea', 'fr': 'nausée', 'de': 'Übelkeit'}
        }
    }
}

# Simple translation dictionary for testing
TRANSLATIONS = {
    'en-es': {
        'hello': 'hola',
        'good morning': 'buenos días',
        'how are you': 'cómo estás',
        'thank you': 'gracias',
        'yes': 'sí',
        'no': 'no',
        'doctor': 'médico',
        'hospital': 'hospital',
        'patient': 'paciente',
        'medicine': 'medicina',
        'pain': 'dolor',
        'I need help': 'necesito ayuda',
        'emergency': 'emergencia'
    },
    'en-fr': {
        'hello': 'bonjour',
        'good morning': 'bonjour',
        'how are you': 'comment allez-vous',
        'thank you': 'merci',
        'yes': 'oui',
        'no': 'non',
        'doctor': 'médecin',
        'hospital': 'hôpital',
        'patient': 'patient',
        'medicine': 'médicament',
        'pain': 'douleur',
        'I need help': "j'ai besoin d'aide",
        'emergency': 'urgence'
    }
}

class MockTranslationModel:
    """Mock translation model for testing"""
    
    def __init__(self, model_path: str, source_lang: str, target_lang: str):
        """
        Initialize the mock translation model
        
        Args:
            model_path: Path to the model directory
            source_lang: Source language code
            target_lang: Target language code
        """
        self.model_path = model_path
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.language_pair = f"{source_lang}-{target_lang}"
        
        print(f"Loaded mock translation model for {source_lang} to {target_lang}")
    
    def translate(self, text: str, medical_context: str = "general") -> Dict[str, Any]:
        """
        Translate text from source to target language
        
        Args:
            text: Text to translate
            medical_context: Medical context for terminology handling
            
        Returns:
            Dictionary with translation results
        """
        start_time = time.time()
        
        # Lowercase the text for dictionary lookup
        text_lower = text.lower()
        
        # Check if we have a direct translation
        if self.language_pair in TRANSLATIONS and text_lower in TRANSLATIONS[self.language_pair]:
            translated_text = TRANSLATIONS[self.language_pair][text_lower]
        else:
            # Simple word-by-word translation for testing
            words = text.split()
            translated_words = []
            
            for word in words:
                word_lower = word.lower()
                if self.language_pair in TRANSLATIONS and word_lower in TRANSLATIONS[self.language_pair]:
                    translated_words.append(TRANSLATIONS[self.language_pair][word_lower])
                else:
                    # Keep original word if no translation available
                    translated_words.append(word)
            
            translated_text = ' '.join(translated_words)
        
        # Apply medical terminology
        translated_text = self._apply_medical_terminology(
            text, 
            translated_text, 
            medical_context
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return {
            "translatedText": translated_text,
            "confidence": "high",
            "processingTime": processing_time
        }
    
    def _apply_medical_terminology(
        self, 
        source_text: str, 
        translated_text: str, 
        medical_context: str
    ) -> str:
        """Apply medical terminology corrections"""
        # Check if we have terminology for this language pair and context
        if (self.source_lang in MEDICAL_TERMS and 
            medical_context in MEDICAL_TERMS[self.source_lang]):
            
            terms = MEDICAL_TERMS[self.source_lang][medical_context]
            
            # Look for terms in the source text and replace in translation
            for term, translations in terms.items():
                if term.lower() in source_text.lower() and self.target_lang in translations:
                    # Simple replacement
                    translated_text = translated_text.replace(
                        term, translations[self.target_lang]
                    )
        
        return translated_text


def load_model(model_path: str, source_lang: str, target_lang: str) -> MockTranslationModel:
    """
    Load the mock translation model
    
    Args:
        model_path: Path to the model
        source_lang: Source language code
        target_lang: Target language code
        
    Returns:
        Loaded mock translation model
    """
    # Simulate model loading time
    time.sleep(0.5)
    
    return MockTranslationModel(model_path, source_lang, target_lang)


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description="MedTranslate AI Edge Mock Inference")
    parser.add_argument("model_path", help="Path to the translation model")
    parser.add_argument("text", help="Text to translate")
    parser.add_argument("source_lang", help="Source language code")
    parser.add_argument("target_lang", help="Target language code")
    parser.add_argument("--context", default="general", help="Medical context")
    
    args = parser.parse_args()
    
    try:
        # Load model
        model = load_model(args.model_path, args.source_lang, args.target_lang)
        
        # Translate text
        result = model.translate(args.text, args.context)
        
        # Print result as JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
