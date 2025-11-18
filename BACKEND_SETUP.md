# WildSnap Backend Setup Guide

## Prerequisites
- Python 3.8+
- pip (Python package manager)

## Installation Steps

### 1. Install Python Dependencies
Run the following command from the project root directory:

```bash
pip install -r requirements.txt
```

This will install:
- Flask (web framework)
- Flask-CORS (for frontend-backend communication)
- Ultralytics (YOLOv8)
- Pillow (image processing)
- NumPy (numerical computing)
- OpenCV (computer vision)

### 2. Add Model Files
Place the following model files in the project root directory:
- `yolov8n.pt` - YOLOv8 Nano model (lightweight)
- `best.pt` - Your custom trained model

These will be automatically downloaded on first use if not present.

### 3. Run the Backend Server
From the project root, run:

```bash
python backend.py
```

The server will start on `http://localhost:5000`

You should see output like:
```
==================================================
🐾 WildSnap Backend API Starting...
==================================================
Loading YOLOv8n model...
✓ YOLOv8n loaded successfully
Loading best.pt model...
✓ best.pt loaded successfully
```

### 4. Verify Backend is Running
- Open your browser and go to `http://localhost:5000`
- You should see the API endpoints documentation
- The frontend will automatically connect to this backend

## API Endpoints

### Health Check
```
GET http://localhost:5000/api/health
```

### Detect Animals (Base64 Image)
```
POST http://localhost:5000/api/detect
Content-Type: application/json

{
  "image": "data:image/png;base64,...",
  "model": "yolov8n" | "best" | "compare",
  "confidence": 0.0-1.0,
  "iou": 0.0-1.0,
  "filter_animals": true/false
}
```

### Detect from File Upload
```
POST http://localhost:5000/api/detect-file
Content-Type: multipart/form-data

file: <image_file>
model: "yolov8n" | "best" | "compare"
confidence: 0.0-1.0
iou: 0.0-1.0
filter_animals: true/false
```

### Get Models Info
```
GET http://localhost:5000/api/models
```

## Running Both Frontend and Backend

### Terminal 1 - Frontend (Next.js)
```bash
npm run dev
# Runs on http://localhost:3000
```

### Terminal 2 - Backend (Flask)
```bash
python backend.py
# Runs on http://localhost:5000
```

Then open http://localhost:3000 in your browser.

## Troubleshooting

### CORS Issues
- Make sure backend is running before opening frontend
- Flask-CORS is already configured in backend.py

### Model Loading Issues
- Check that `yolov8n.pt` and `best.pt` are in the project root
- Models will auto-download on first use (~100MB for yolov8n)
- Ensure you have stable internet connection

### Port Already in Use
- Frontend (3000): Kill process on port 3000
- Backend (5000): Kill process on port 5000

### GPU Support
To use GPU acceleration (if available):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

## Notes
- First detection may be slower (model warm-up)
- Supported formats: JPG, PNG, WebP
- Max recommended image size: 2560x2560 pixels
