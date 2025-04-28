"""
MedTranslate AI Edge Service

This is a Flask application that provides an API for the edge device.
"""

import os
import json
import time
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

# Import local modules
from inference import load_model, TranslationModel
from audio_processor import AudioProcessor, process_audio_file

# Initialize Flask app
app = Flask(__name__)

# Configure app
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload size
app.config['UPLOAD_FOLDER'] = '/tmp'

# Initialize models
models = {}
audio_processor = None

@app.before_first_request
def initialize():
    """Initialize models and processors"""
    global audio_processor
    
    # Initialize audio processor
    audio_processor = AudioProcessor()
    
    # Load available models
    model_dir = os.environ.get('MODEL_DIR', '/models')
    if os.path.exists(model_dir):
        for filename in os.listdir(model_dir):
            if filename.endswith('.bin'):
                try:
                    # Parse language pair from filename
                    language_pair = filename.split('.')[0]
                    source_lang, target_lang = language_pair.split('-')
                    
                    # Load model
                    model_path = os.path.join(model_dir, filename)
                    models[language_pair] = load_model(model_path, source_lang, target_lang)
                    
                    app.logger.info(f"Loaded model: {language_pair}")
                except Exception as e:
                    app.logger.error(f"Error loading model {filename}: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Get model information
    model_info = {}
    model_dir = os.environ.get('MODEL_DIR', '/models')
    
    if os.path.exists(model_dir):
        for filename in os.listdir(model_dir):
            if filename.endswith('.bin'):
                try:
                    # Get file stats
                    model_path = os.path.join(model_dir, filename)
                    stats = os.stat(model_path)
                    
                    # Parse language pair from filename
                    language_pair = filename.split('.')[0]
                    
                    model_info[language_pair] = {
                        'size': stats.st_size,
                        'modified': time.ctime(stats.st_mtime)
                    }
                except Exception as e:
                    app.logger.error(f"Error getting model info for {filename}: {e}")
    
    # Get last sync time
    manifest_file = os.path.join(os.environ.get('CONFIG_DIR', '/config'), 'model_manifest.json')
    last_sync = None
    
    if os.path.exists(manifest_file):
        try:
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
                last_sync = manifest.get('last_sync')
        except Exception as e:
            app.logger.error(f"Error reading manifest file: {e}")
    
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'models': model_info,
        'lastSync': last_sync
    })

@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text endpoint"""
    try:
        # Get request data
        data = request.json
        text = data.get('text')
        source_language = data.get('sourceLanguage')
        target_language = data.get('targetLanguage')
        context = data.get('context', 'general')
        
        # Validate input
        if not text or not source_language or not target_language:
            return jsonify({
                'error': 'Missing required parameters: text, sourceLanguage, targetLanguage'
            }), 400
        
        # Get model
        model_key = f"{source_language}-{target_language}"
        if model_key not in models:
            return jsonify({
                'error': f"Translation model not available for {source_language} to {target_language}"
            }), 404
        
        # Translate text
        result = models[model_key].translate(text, context)
        
        return jsonify({
            'originalText': text,
            'translatedText': result['translatedText'],
            'confidence': result['confidence'],
            'processingTime': result['processingTime']
        })
    
    except Exception as e:
        app.logger.error(f"Error translating text: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/translate-audio', methods=['POST'])
def translate_audio():
    """Translate audio endpoint"""
    try:
        # Check if audio processor is initialized
        if audio_processor is None:
            return jsonify({
                'error': 'Audio processor not initialized'
            }), 500
        
        # Get request data
        if request.is_json:
            # Handle base64 encoded audio
            data = request.json
            audio_data = data.get('audioData')
            source_language = data.get('sourceLanguage')
            target_language = data.get('targetLanguage')
            context = data.get('context', 'general')
            
            # Validate input
            if not audio_data or not source_language or not target_language:
                return jsonify({
                    'error': 'Missing required parameters: audioData, sourceLanguage, targetLanguage'
                }), 400
            
            # Save base64 audio to temporary file
            import base64
            audio_bytes = base64.b64decode(audio_data)
            audio_path = os.path.join(app.config['UPLOAD_FOLDER'], f"audio_{int(time.time())}.wav")
            
            with open(audio_path, 'wb') as f:
                f.write(audio_bytes)
        else:
            # Handle file upload
            if 'audio' not in request.files:
                return jsonify({
                    'error': 'No audio file provided'
                }), 400
            
            audio_file = request.files['audio']
            source_language = request.form.get('sourceLanguage')
            target_language = request.form.get('targetLanguage')
            context = request.form.get('context', 'general')
            
            # Validate input
            if not audio_file or not source_language or not target_language:
                return jsonify({
                    'error': 'Missing required parameters: audio, sourceLanguage, targetLanguage'
                }), 400
            
            # Save uploaded file
            filename = secure_filename(audio_file.filename)
            audio_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            audio_file.save(audio_path)
        
        # Process audio file
        result = process_audio_file(
            audio_path,
            source_language,
            target_language,
            context
        )
        
        # Clean up temporary file
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        if 'error' in result:
            return jsonify({
                'error': result['error']
            }), 500
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error translating audio: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/sync-models', methods=['POST'])
def sync_models():
    """Sync models endpoint"""
    try:
        # Import model sync module
        import model_sync
        
        # Create synchronizer
        model_dir = os.environ.get('MODEL_DIR', '/models')
        manifest_file = os.path.join(os.environ.get('CONFIG_DIR', '/config'), 'model_manifest.json')
        api_url = os.environ.get('CLOUD_API_URL', 'https://api.medtranslate.ai')
        
        synchronizer = model_sync.ModelSynchronizer(model_dir, manifest_file, api_url)
        
        # Sync models
        result = synchronizer.sync_models()
        
        # Reload models if new ones were downloaded
        if result.get('success') and result.get('downloaded'):
            initialize()
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error syncing models: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
