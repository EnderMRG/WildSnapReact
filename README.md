
# WildSnap - AI-Powered Wildlife Detection

WildSnap is a web application that uses computer vision to detect wildlife in images. It provides a user-friendly interface to upload images, select a detection model, and view the results with bounding boxes and confidence scores.

## Features

- **Dual Model Support:** Choose between the lightweight YOLOv8n model or a custom-trained model for detection.
- **Real-Time Detection:** Get instant feedback with adjustable confidence and IoU thresholds.
- **Side-by-Side Comparison:** Compare the performance of both models on your images.
- **Detailed Results:** View the number of objects detected, average confidence, and inference time.
- **Raw Data:** Inspect the raw JSON output from the detection models.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Python, Flask, PyTorch, YOLOv8
- **UI Components:** shadcn/ui

## Getting Started

### Prerequisites

- Node.js and npm (or pnpm/yarn)
- Python 3.8+ and pip
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/wildsnap.git
   cd wildsnap
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up the Python backend:**
   - Create and activate a virtual environment:
     ```bash
     python -m venv .venv
     source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
     ```
   - Install Python dependencies:
     ```bash
     pip install -r requirements.txt
     ```

### Running the Application

1. **Start the backend server:**
   ```bash
   python backend.py
   ```
   The backend will be running at `http://127.0.0.1:5000`.

2. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:3000`.

3. **Open your browser** and navigate to `http://localhost:3000` to use the application.

## How to Use

1. **Upload an image:** Drag and drop an image file or click to select one.
2. **Configure detection settings:**
   - Adjust the **Confidence Threshold** to filter out detections with low confidence.
   - Adjust the **IoU Threshold** for non-max suppression.
   - Choose a **Detection Model** (YOLOv8n, Custom, or Compare).
3. **Click "Start Detection"** to process the image.
4. **View the results:** The detected objects will be highlighted in the image, and detailed statistics will be displayed below.

## Project Structure

```
.
├── app/                # Next.js app directory
│   ├── detect/         # Detection page components
│   └── ...
├── components/         # Shared UI components
├── public/             # Static assets
├── backend.py          # Flask backend server
├── requirements.txt    # Python dependencies
├── package.json        # Frontend dependencies
└── ...
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
