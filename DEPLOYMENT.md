# WildSnap - Production Deployment Guide

## Current Deployment Status

✅ **Frontend**: Production build complete
✅ **Backend**: Running with CORS support
✅ **Both servers**: Ready for deployment

## System URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Network Access**: http://25.34.12.161:3000

## Quick Start (Windows)

### Option 1: Using Deploy Script
```bash
cd f:\Wildre
deploy.bat
```

This will:
1. Build the frontend
2. Start the backend server
3. Start the production frontend server

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd f:\Wildre
python backend.py
```

**Terminal 2 - Frontend:**
```bash
cd f:\Wildre
npm run start
```

## Production Features

### Frontend (Next.js)
- ✅ Optimized production build
- ✅ Static site generation (SSG)
- ✅ Route prerendering
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ CSS/JS minification

### Backend (Flask)
- ✅ YOLOv8n model (Lightweight)
- ✅ Custom best.pt model
- ✅ CORS enabled for all origins
- ✅ Error handling
- ✅ JSON API endpoints
- ✅ Base64 image support

## API Endpoints

### Health Check
```
GET http://localhost:5000/api/health
```

### Detect Animals
```
POST http://localhost:5000/api/detect
Content-Type: application/json

{
  "image": "data:image/png;base64,...",
  "model": "yolov8n|best|compare",
  "confidence": 0.0-1.0,
  "iou": 0.0-1.0,
  "filter_animals": true/false
}
```

### Get Models Info
```
GET http://localhost:5000/api/models
```

## Deployment on Cloud Platforms

### Option 1: Heroku (Recommended for Backend)

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create wildsnap-backend

# Deploy backend
git push heroku main

# Scale
heroku ps:scale web=1
```

### Option 2: Vercel (Recommended for Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 3: AWS EC2

```bash
# SSH into EC2
ssh -i key.pem ubuntu@your-instance

# Install dependencies
sudo apt-get update
sudo apt-get install python3-pip nodejs npm

# Clone repo
git clone your-repo
cd Wildre

# Install dependencies
pip install -r requirements.txt
npm install --legacy-peer-deps

# Start services
python backend.py &
npm run start
```

## Performance Optimization

### Frontend Optimizations
- Static page prerendering
- Code splitting by route
- Automatic compression
- Browser caching

### Backend Optimizations
- Model caching
- Batch processing support
- Connection pooling
- Request validation

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### Backend (.env)
```
FLASK_ENV=production
FLASK_DEBUG=false
```

## Monitoring & Logging

### Frontend Logs
Check browser console: F12 → Console tab

### Backend Logs
Monitor terminal output for:
- Model loading status
- API request logs
- Error messages
- Inference times

## Security Considerations

1. **CORS**: Currently allows all origins. Configure for production:
```python
CORS(app, origins=['your-domain.com'])
```

2. **Rate Limiting**: Add for production
3. **Authentication**: Consider API key authentication
4. **HTTPS**: Use SSL/TLS certificates
5. **Input Validation**: Verify image sizes and formats

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Models Not Loading
- Check file permissions
- Verify yolov8n.pt and best.pt exist
- Ensure disk space for model download (~500MB)

### Frontend Not Connecting to Backend
- Verify backend is running: http://localhost:5000
- Check CORS headers
- Verify network connectivity
- Check firewall settings

### Slow Detection
- First run loads models (~5s)
- Reduce image size
- Use GPU if available
- Consider model quantization

## Database Setup (Optional)

For storing detection history:
```bash
# Install SQLite
pip install flask-sqlalchemy

# Create database
python -c "from backend import db; db.create_all()"
```

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install --legacy-peer-deps
      - run: npm run build
      - run: npm run start
```

## Version Information

- **Next.js**: 16.0.3
- **React**: 19.2.0
- **Flask**: 3.0.0
- **YOLOv8**: Latest
- **Python**: 3.8+
- **Node**: 18+

## Support & Documentation

- Next.js Docs: https://nextjs.org/docs
- Flask Docs: https://flask.palletsprojects.com/
- YOLOv8 Docs: https://docs.ultralytics.com/

## Deployment Checklist

- [ ] Frontend builds successfully
- [ ] Backend starts without errors
- [ ] Both services running
- [ ] CORS working (test with browser)
- [ ] Models loaded properly
- [ ] Test detection with sample image
- [ ] Verify API endpoints
- [ ] Check error logs
- [ ] Performance acceptable
- [ ] Security review complete

---

**🎉 WildSnap is ready for production deployment!**

For questions or issues, check the logs and ensure all dependencies are installed.
