"""
Flask backend for WildSnap - Animal Detection API
Integrates YOLOv8 models for real-time animal detection
"""

from flask import Flask, request, jsonify
from ultralytics import YOLO
from PIL import Image
import numpy as np
import base64
import io
import time
import json
import os
from datetime import datetime

app = Flask(__name__)

# Manual CORS implementation
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return '', 200

# --- MODEL LOADING ---
models = {}

def load_models():
    """Load YOLOv8 models at startup"""
    try:
        print("Loading YOLOv8n model...")
        models['yolov8n'] = YOLO("yolov8n.pt")
        print("✓ YOLOv8n loaded successfully")
    except Exception as e:
        print(f"✗ Error loading yolov8n: {e}")
        models['yolov8n'] = None
    
    try:
        print("Loading best.pt model...")
        models['best'] = YOLO("best.pt")
        print("✓ best.pt loaded successfully")
    except Exception as e:
        print(f"⚠ Warning: best.pt not found: {e}")
        models['best'] = None

# Load models when app starts
load_models()

# --- HELPER FUNCTIONS ---

def encode_image_to_base64(image_pil):
    """Convert PIL image to base64 string"""
    buffered = io.BytesIO()
    image_pil.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def run_detection(model, image_data, conf_threshold, iou_threshold, filter_animals=False):
    """
    Run YOLO detection on image
    Returns: annotated_image, detections, inference_time
    """
    if model is None:
        return None, [], 0
    
    try:
        # Convert base64 to PIL Image
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        else:
            image = Image.open(image_data)
        
        img_np = np.array(image.convert("RGB"))
        
        # Run inference
        start_time = time.time()
        results = model.predict(
            source=img_np,
            conf=conf_threshold,
            iou=iou_threshold,
            verbose=False
        )
        inference_time = (time.time() - start_time) * 1000  # milliseconds
        
        # Create annotated image
        annotated_bgr = results[0].plot()
        annotated_rgb = annotated_bgr[..., ::-1]
        annotated_image_pil = Image.fromarray(annotated_rgb)
        
        # Extract detections
        detections = []
        animal_classes = {
            'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
            'elephant', 'bear', 'zebra', 'giraffe', 'person'
        }
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls.item())
                class_name = model.names.get(cls_id, str(cls_id))
                
                # Filter animals if requested (only for yolov8n)
                if filter_animals and model.model_name == 'YOLOv8n':
                    if class_name.lower() not in animal_classes:
                        continue
                
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = map(int, xyxy)
                conf = float(box.conf.item())
                
                detections.append({
                    "class": class_name,
                    "confidence": round(conf, 4),
                    "bbox": [x1, y1, x2, y2],
                    "width": x2 - x1,
                    "height": y2 - y1
                })
        
        return annotated_image_pil, detections, inference_time
    
    except Exception as e:
        print(f"Error in detection: {e}")
        return None, [], 0

# --- API ROUTES ---

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'yolov8n': models['yolov8n'] is not None,
            'best': models['best'] is not None
        }
    }), 200

@app.route('/api/detect', methods=['POST'])
def detect():
    """
    Main detection endpoint
    Expected JSON:
    {
        "image": "base64_string_or_file",
        "model": "yolov8n" | "best" | "compare",
        "confidence": 0.0-1.0,
        "iou": 0.0-1.0,
        "filter_animals": true/false
    }
    """
    try:
        data = request.get_json()
        
        # Get parameters
        image_data = data.get('image')
        model_choice = data.get('model', 'yolov8n')
        confidence = float(data.get('confidence', 0.4))
        iou = float(data.get('iou', 0.5))
        filter_animals = data.get('filter_animals', False)
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        results = {}
        
        if model_choice == 'yolov8n':
            model = models['yolov8n']
            if not model:
                return jsonify({'error': 'YOLOv8n model not available'}), 500
            
            ann_img, detections, inf_time = run_detection(
                model, image_data, confidence, iou, filter_animals
            )
            
            results['yolov8n'] = {
                'detections': detections,
                'inference_time': round(inf_time, 2),
                'image': encode_image_to_base64(ann_img) if ann_img else None,
                'object_count': len(detections),
                'avg_confidence': round(
                    sum(d['confidence'] for d in detections) / len(detections), 4
                ) if detections else 0
            }
        
        elif model_choice == 'best':
            model = models['best']
            if not model:
                return jsonify({'error': 'best.pt model not available'}), 500
            
            ann_img, detections, inf_time = run_detection(
                model, image_data, confidence, iou, filter_animals
            )
            
            results['best'] = {
                'detections': detections,
                'inference_time': round(inf_time, 2),
                'image': encode_image_to_base64(ann_img) if ann_img else None,
                'object_count': len(detections),
                'avg_confidence': round(
                    sum(d['confidence'] for d in detections) / len(detections), 4
                ) if detections else 0
            }
        
        elif model_choice == 'compare':
            # Run both models
            model1 = models['yolov8n']
            model2 = models['best']
            
            if not model1:
                return jsonify({'error': 'YOLOv8n model not available'}), 500
            if not model2:
                return jsonify({'error': 'best.pt model not available'}), 500
            
            ann_img1, det1, time1 = run_detection(
                model1, image_data, confidence, iou, filter_animals
            )
            ann_img2, det2, time2 = run_detection(
                model2, image_data, confidence, iou, filter_animals
            )
            
            results['yolov8n'] = {
                'detections': det1,
                'inference_time': round(time1, 2),
                'image': encode_image_to_base64(ann_img1) if ann_img1 else None,
                'object_count': len(det1),
                'avg_confidence': round(
                    sum(d['confidence'] for d in det1) / len(det1), 4
                ) if det1 else 0
            }
            
            results['best'] = {
                'detections': det2,
                'inference_time': round(time2, 2),
                'image': encode_image_to_base64(ann_img2) if ann_img2 else None,
                'object_count': len(det2),
                'avg_confidence': round(
                    sum(d['confidence'] for d in det2) / len(det2), 4
                ) if det2 else 0
            }
        
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        print(f"Error in /api/detect: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models_info():
    """Get available models info"""
    return jsonify({
        'models': {
            'yolov8n': {
                'available': models['yolov8n'] is not None,
                'type': 'YOLOv8 Nano',
                'description': 'Lightweight general object detection'
            },
            'best': {
                'available': models['best'] is not None,
                'type': 'Custom Model',
                'description': 'Custom-trained animal detection model'
            }
        }
    }), 200

@app.route('/api/detect-file', methods=['POST'])
def detect_file():
    """
    Detect from uploaded file
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        model_choice = request.form.get('model', 'yolov8n')
        confidence = float(request.form.get('confidence', 0.4))
        iou = float(request.form.get('iou', 0.5))
        filter_animals = request.form.get('filter_animals', 'false').lower() == 'true'
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Process file
        image = Image.open(file.stream)
        
        # Convert to base64 for consistency
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        image_base64 = base64.b64encode(buffered.getvalue()).decode()
        image_data = f"data:image/png;base64,{image_base64}"
        
        # Call detection
        data = {
            'image': image_data,
            'model': model_choice,
            'confidence': confidence,
            'iou': iou,
            'filter_animals': filter_animals
        }
        
        request.json = data
        return detect()
    
    except Exception as e:
        print(f"Error in /api/detect-file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'app': 'WildSnap API',
        'version': '1.0.0',
        'endpoints': {
            '/api/health': 'Health check',
            '/api/detect': 'POST - Detect animals in base64 image',
            '/api/detect-file': 'POST - Detect animals in uploaded file',
            '/api/models': 'GET - List available models'
        }
    }), 200

# --- ERROR HANDLERS ---

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# --- MAIN ---

if __name__ == '__main__':
    print("=" * 50)
    print("🐾 WildSnap Backend API Starting...")
    print("=" * 50)
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
