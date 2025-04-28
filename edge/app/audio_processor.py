#!/usr/bin/env python3
"""
MedTranslate AI Edge Audio Processor

This script handles audio transcription and speech synthesis
for edge deployment.
"""

import os
import sys
import json
import time
import wave
import argparse
import numpy as np
from typing import Dict, Any, Tuple
import soundfile as sf

# Import local modules
from inference import load_model

# Try to import optional dependencies
try:
    import torch
    import torchaudio
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor, AutoProcessor, AutoModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Default paths
DEFAULT_MODEL_DIR = os.environ.get('MODEL_DIR', '/models')
DEFAULT_CACHE_DIR = os.environ.get('CACHE_DIR', '/cache')
DEFAULT_OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/tmp')

# Language code mappings
LANGUAGE_CODES = {
    'en': 'english',
    'es': 'spanish',
    'fr': 'french',
    'de': 'german',
    'it': 'italian',
    'pt': 'portuguese',
    'zh': 'chinese',
    'ja': 'japanese',
    'ko': 'korean',
    'ar': 'arabic',
    'hi': 'hindi',
    'ru': 'russian'
}


class AudioProcessor:
    """Audio processing for transcription and synthesis"""
    
    def __init__(self):
        """Initialize the audio processor"""
        self.asr_models = {}
        self.tts_models = {}
        
        # Initialize models if available
        if TRANSFORMERS_AVAILABLE:
            print("Transformers library available for ASR and TTS")
        else:
            print("Transformers library not available, using fallback methods")
        
        if WHISPER_AVAILABLE:
            print("Whisper library available for ASR")
            # Load whisper model (tiny for edge deployment)
            self.whisper_model = whisper.load_model("tiny")
        else:
            print("Whisper library not available")
            self.whisper_model = None
    
    def transcribe_audio(self, audio_path: str, language: str) -> Dict[str, Any]:
        """
        Transcribe audio file to text
        
        Args:
            audio_path: Path to the audio file
            language: Language code
            
        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()
        
        # Check if audio file exists
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Use Whisper if available (best quality)
        if self.whisper_model is not None:
            result = self._transcribe_with_whisper(audio_path, language)
        # Use Wav2Vec2 if available
        elif TRANSFORMERS_AVAILABLE:
            result = self._transcribe_with_wav2vec2(audio_path, language)
        # Fallback to simple method
        else:
            result = self._transcribe_fallback(audio_path, language)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        result["processingTime"] = processing_time
        
        return result
    
    def _transcribe_with_whisper(self, audio_path: str, language: str) -> Dict[str, Any]:
        """Transcribe audio using Whisper model"""
        # Get language name from code
        lang_name = LANGUAGE_CODES.get(language, "english")
        
        # Transcribe audio
        result = self.whisper_model.transcribe(
            audio_path,
            language=lang_name,
            task="transcribe"
        )
        
        return {
            "text": result["text"],
            "confidence": 0.8,  # Whisper doesn't provide confidence scores
            "segments": result.get("segments", [])
        }
    
    def _transcribe_with_wav2vec2(self, audio_path: str, language: str) -> Dict[str, Any]:
        """Transcribe audio using Wav2Vec2 model"""
        # Load model for language if not already loaded
        if language not in self.asr_models:
            model_name = self._get_asr_model_name(language)
            processor = Wav2Vec2Processor.from_pretrained(model_name)
            model = Wav2Vec2ForCTC.from_pretrained(model_name)
            self.asr_models[language] = (processor, model)
        else:
            processor, model = self.asr_models[language]
        
        # Load audio
        speech_array, sample_rate = sf.read(audio_path)
        if len(speech_array.shape) > 1:
            speech_array = speech_array[:, 0]  # Take first channel if stereo
        
        # Resample if needed
        if sample_rate != 16000:
            # Simple resampling - in production, use a proper resampling library
            speech_array = np.interp(
                np.linspace(0, len(speech_array), int(len(speech_array) * 16000 / sample_rate)),
                np.arange(len(speech_array)),
                speech_array
            )
            sample_rate = 16000
        
        # Preprocess audio
        inputs = processor(
            speech_array,
            sampling_rate=sample_rate,
            return_tensors="pt",
            padding=True
        )
        
        # Perform inference
        with torch.no_grad():
            logits = model(inputs.input_values).logits
        
        # Decode
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)[0]
        
        # Calculate confidence (simplified)
        confidence = torch.softmax(logits, dim=-1).max(dim=-1)[0].mean().item()
        
        return {
            "text": transcription,
            "confidence": min(confidence, 0.99)  # Cap at 0.99
        }
    
    def _transcribe_fallback(self, audio_path: str, language: str) -> Dict[str, Any]:
        """Fallback transcription method (placeholder)"""
        # In a real implementation, this would use a simpler ASR method
        # For now, return a placeholder message
        return {
            "text": "Transcription not available in offline mode.",
            "confidence": 0.1
        }
    
    def _get_asr_model_name(self, language: str) -> str:
        """Get appropriate ASR model name for language"""
        # Map language codes to model names
        model_map = {
            'en': 'facebook/wav2vec2-base-960h',
            'es': 'facebook/wav2vec2-large-xlsr-53-spanish',
            'fr': 'facebook/wav2vec2-large-xlsr-53-french',
            'de': 'facebook/wav2vec2-large-xlsr-53-german',
            'it': 'facebook/wav2vec2-large-xlsr-53-italian',
            'pt': 'facebook/wav2vec2-large-xlsr-53-portuguese',
            'zh': 'jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn',
            'ja': 'jonatasgrosman/wav2vec2-large-xlsr-53-japanese',
            'ru': 'jonatasgrosman/wav2vec2-large-xlsr-53-russian'
        }
        
        return model_map.get(language, 'facebook/wav2vec2-base-960h')
    
    def synthesize_speech(self, text: str, language: str) -> Dict[str, Any]:
        """
        Synthesize speech from text
        
        Args:
            text: Text to synthesize
            language: Language code
            
        Returns:
            Dictionary with synthesis results
        """
        start_time = time.time()
        
        # Use Transformers if available
        if TRANSFORMERS_AVAILABLE:
            result = self._synthesize_with_transformers(text, language)
        # Fallback to simple method
        else:
            result = self._synthesize_fallback(text, language)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        result["processingTime"] = processing_time
        
        return result
    
    def _synthesize_with_transformers(self, text: str, language: str) -> Dict[str, Any]:
        """Synthesize speech using Transformers models"""
        # Load model for language if not already loaded
        if language not in self.tts_models:
            model_name = self._get_tts_model_name(language)
            processor = AutoProcessor.from_pretrained(model_name)
            model = AutoModel.from_pretrained(model_name)
            self.tts_models[language] = (processor, model)
        else:
            processor, model = self.tts_models[language]
        
        # Generate speech
        inputs = processor(text=text, return_tensors="pt")
        with torch.no_grad():
            output = model.generate_speech(inputs["input_ids"], inputs["attention_mask"])
        
        # Save to temporary file
        output_path = os.path.join(DEFAULT_OUTPUT_DIR, f"tts_output_{int(time.time())}.wav")
        sf.write(output_path, output.numpy(), model.config.sampling_rate)
        
        # Convert to base64 for response
        with open(output_path, "rb") as f:
            import base64
            audio_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Clean up
        if os.path.exists(output_path):
            os.remove(output_path)
        
        return {
            "audioData": audio_data,
            "format": "wav",
            "sampleRate": model.config.sampling_rate
        }
    
    def _synthesize_fallback(self, text: str, language: str) -> Dict[str, Any]:
        """Fallback speech synthesis method (placeholder)"""
        # In a real implementation, this would use a simpler TTS method
        # For now, return a placeholder message
        return {
            "audioData": None,
            "format": None,
            "error": "Speech synthesis not available in offline mode."
        }
    
    def _get_tts_model_name(self, language: str) -> str:
        """Get appropriate TTS model name for language"""
        # Map language codes to model names
        model_map = {
            'en': 'facebook/fastspeech2-en-ljspeech',
            'es': 'facebook/fastspeech2-es-css10',
            'fr': 'facebook/fastspeech2-fr-css10',
            'de': 'facebook/fastspeech2-de-css10',
            'zh': 'facebook/fastspeech2-zh-aishell3'
        }
        
        return model_map.get(language, 'facebook/fastspeech2-en-ljspeech')


def process_audio_file(
    audio_path: str,
    source_language: str,
    target_language: str,
    medical_context: str = "general"
) -> Dict[str, Any]:
    """
    Process audio file for translation
    
    Args:
        audio_path: Path to the audio file
        source_language: Source language code
        target_language: Target language code
        medical_context: Medical context
        
    Returns:
        Dictionary with processing results
    """
    try:
        # Initialize audio processor
        audio_processor = AudioProcessor()
        
        # Transcribe audio
        transcription = audio_processor.transcribe_audio(audio_path, source_language)
        
        # Find translation model
        model_name = f"{source_language}-{target_language}"
        model_path = os.path.join(DEFAULT_MODEL_DIR, f"{model_name}.bin")
        
        # Check if model exists, otherwise try fallback model
        if not os.path.exists(model_path):
            model_path = os.path.join(DEFAULT_MODEL_DIR, f"{model_name}-small.bin")
        
        # Load translation model
        translation_model = load_model(model_path, source_language, target_language)
        
        # Translate text
        translation = translation_model.translate(transcription["text"], medical_context)
        
        # Synthesize speech
        audio_response = audio_processor.synthesize_speech(
            translation["translatedText"], 
            target_language
        )
        
        # Return combined result
        return {
            "transcription": transcription["text"],
            "translation": translation["translatedText"],
            "confidence": translation["confidence"],
            "audioResponse": audio_response.get("audioData"),
            "audioFormat": audio_response.get("format"),
            "processingTime": {
                "transcription": transcription["processingTime"],
                "translation": translation["processingTime"],
                "synthesis": audio_response.get("processingTime", 0),
                "total": (
                    transcription["processingTime"] + 
                    translation["processingTime"] + 
                    audio_response.get("processingTime", 0)
                )
            }
        }
    
    except Exception as e:
        return {
            "error": str(e)
        }


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description="MedTranslate AI Edge Audio Processor")
    parser.add_argument("audio_path", help="Path to the audio file")
    parser.add_argument("source_language", help="Source language code")
    parser.add_argument("target_language", help="Target language code")
    parser.add_argument("--context", default="general", help="Medical context")
    
    args = parser.parse_args()
    
    try:
        # Process audio file
        result = process_audio_file(
            args.audio_path,
            args.source_language,
            args.target_language,
            args.context
        )
        
        # Print result as JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
