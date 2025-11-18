# app.py

import streamlit as st
from ultralytics import YOLO
import numpy as np
import pandas as pd
from PIL import Image
import io
import time
import os
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(
    page_title="WildSnap - Animal Detection",
    page_icon="🐾",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- CUSTOM STYLING ---
st.markdown("""
<style>
    /* Main theme colors */
    :root {
        --primary-color: #1f77b4;
        --secondary-color: #ff7f0e;
        --success-color: #2ca02c;
        --danger-color: #d62728;
    }
    
    /* Header styling */
    .header-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 2rem;
    }
    
    .header-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin: 0;
    }
    
    .header-subtitle {
        font-size: 1rem;
        opacity: 0.9;
        margin-top: 0.5rem;
    }
    
    /* Card styling */
    .metric-card {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    /* Detection summary */
    .detection-summary {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #667eea;
    }
    
    /* Result panels */
    .result-panel {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin: 1rem 0;
    }
    
    /* Button styling */
    .stButton > button {
        background-color: #667eea;
        color: white;
        border-radius: 5px;
        padding: 0.75rem 1.5rem;
        border: none;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .stButton > button:hover {
        background-color: #764ba2;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    /* Slider styling */
    .stSlider {
        padding: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# --- MODEL LOADING ---
@st.cache_resource
def load_yolov8n_model():
    try:
        return YOLO("yolov8n.pt")
    except Exception as e:
        st.error(f"Error loading yolov8n model: {e}")
        st.stop()

@st.cache_resource
def load_best_model():
    try:
        return YOLO("best.pt")
    except Exception:
        st.warning("Custom 'best.pt' not found. Upload it to the same directory.")
        return None

yolov8n_model = load_yolov8n_model()
best_model = load_best_model()

# --- INFERENCE FUNCTION ---
def run_inference(model, image, conf_threshold, iou_threshold, filter_animals):
    # Convert image
    img_np = np.array(image.convert("RGB"))

    start = time.time()
    results = model.predict(
        source=img_np,
        conf=conf_threshold,
        iou=iou_threshold,
        verbose=False
    )
    end = time.time()
    inference_time = (end - start) * 1000  # ms

    annotated_bgr = results[0].plot()
    annotated_rgb = annotated_bgr[..., ::-1]
    annotated_image_pil = Image.fromarray(annotated_rgb)

    detections = []
    animal_classes = {
        'bird','cat','dog','horse','sheep','cow',
        'elephant','bear','zebra','giraffe'
    }

    is_standard_model = (model is yolov8n_model)

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls.item())
            class_name = model.names.get(cls_id, str(cls_id))

            if filter_animals and is_standard_model:
                if class_name.lower() not in animal_classes:
                    continue

            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = map(int, xyxy)
            conf = float(box.conf.item())

            detections.append({
                "class_name": class_name,
                "confidence": conf,
                "x1": x1, "y1": y1, "x2": x2, "y2": y2
            })

    return annotated_image_pil, detections, inference_time


# --- RESULT VIEW ---
def display_results(annotated_image, detections, inference_time, show_raw_data, model_name):
    # Display annotated image
    st.markdown(f"""
    <div class="result-panel">
        <h4>📸 Detection Results - {model_name}</h4>
    </div>
    """, unsafe_allow_html=True)
    
    st.image(annotated_image, use_column_width=True)

    if len(detections) == 0:
        st.info("✓ No objects detected in this image.")
        return

    # Metrics row
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("⚡ Inference Time", f"{inference_time:.2f} ms")
    with col2:
        st.metric("🎯 Total Detections", len(detections))
    with col3:
        if len(detections) > 0:
            df_temp = pd.DataFrame(detections)
            st.metric("📊 Unique Classes", df_temp['class_name'].nunique())

    # Detection summary
    df = pd.DataFrame(detections)
    
    st.markdown("""
    <div class="detection-summary">
        <h5>📋 Detection Breakdown</h5>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns([1, 2])
    with col1:
        summary_data = df['class_name'].value_counts()
        st.dataframe(summary_data, column_config={"value": st.column_config.NumberColumn("Count")})
    
    with col2:
        st.bar_chart(df['class_name'].value_counts())

    if show_raw_data:
        with st.expander("🔍 View Raw Detection Data"):
            st.dataframe(df, use_container_width=True)

# --- MAIN UI ---
def main_ui():
    # Hero Header
    st.markdown("""
    <div class="header-container">
        <div class="header-title">🐾 WildSnap</div>
        <div class="header-subtitle">Advanced Animal Detection using YOLOv8 AI</div>
    </div>
    """, unsafe_allow_html=True)

    # --- SIDEBAR CONTROLS ---
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        st.subheader("🎯 Detection Settings")
        conf_threshold = st.slider(
            "Confidence Threshold",
            0.0, 1.0, 0.4, 0.05,
            help="Higher values = more confident detections only"
        )
        iou_threshold = st.slider(
            "IoU Threshold",
            0.0, 1.0, 0.5, 0.05,
            help="Lower values = more detections, Higher = less overlap"
        )

        st.divider()
        st.subheader("🔧 Output Options")
        filter_animals = st.checkbox(
            "Filter for animal classes (YOLOv8n only)",
            value=True,
            help="Only show animal detections, exclude other objects"
        )
        show_raw_data = st.checkbox(
            "Show raw detection data",
            value=False,
            help="Display detailed detection coordinates and scores"
        )

        st.divider()
        st.subheader("🤖 Model Selection")
        model_choice = st.radio(
            "Select Detection Model:",
            ["YOLOv8n (Lightweight)", "Custom best.pt", "Compare Both Models"],
            index=2,
            help="Choose which model(s) to use for detection"
        )
        
        st.divider()
        with st.expander("ℹ️ About Models"):
            st.write("""
            - **YOLOv8n**: Fast, lightweight general object detection
            - **best.pt**: Your custom-trained model for specialized detection
            - **Compare**: Side-by-side comparison of both models
            """)

    # Main content
    st.markdown("### 📤 Upload Your Image(s)")
    st.write("Upload one or more images to detect animals and objects.")
    
    # --- IMAGE INPUT ---
    uploaded_files = st.file_uploader(
        "Choose images (PNG, JPG, JPEG)",
        type=["png", "jpg", "jpeg"],
        accept_multiple_files=True,
        key="image_uploader"
    )

    if not uploaded_files:
        # Display info when no images uploaded
        col1, col2, col3 = st.columns(3)
        with col1:
            st.info("📷 No images selected")
        with col2:
            st.write("")
        with col3:
            st.write("")
        
        st.divider()
        st.markdown("""
        #### 🎓 How to Use
        1. **Upload** one or more images using the file uploader above
        2. **Configure** detection settings in the sidebar
        3. **Choose** your preferred model(s)
        4. **View** results with bounding boxes and statistics
        5. **Export** or download your annotated images
        """)
        return

    # --- PROCESSING ---
    st.divider()
    st.markdown(f"### 🔍 Processing {len(uploaded_files)} Image(s)")
    
    for idx, file in enumerate(uploaded_files, 1):
        try:
            image = Image.open(file)
        except Exception as e:
            st.error(f"❌ Error opening image '{file.name}': {e}")
            continue

        # Image header
        st.markdown(f"""
        <div class="result-panel">
            <h4>📄 Image {idx}: {file.name}</h4>
        </div>
        """, unsafe_allow_html=True)

        if model_choice == "YOLOv8n (Lightweight)":
            col_left, col_right = st.columns([1, 1])
            
            with col_left:
                st.write("**Original Image:**")
                st.image(image, use_column_width=True)
            
            with col_right:
                st.write("**YOLOv8n Detection:**")
                with st.spinner("🔄 Running YOLOv8n inference..."):
                    ann, det, time_ms = run_inference(
                        yolov8n_model, image, conf_threshold, iou_threshold, filter_animals
                    )
                st.image(ann, use_column_width=True)
            
            display_results(ann, det, time_ms, show_raw_data, "YOLOv8n")

        elif model_choice == "Custom best.pt":
            col_left, col_right = st.columns([1, 1])
            
            with col_left:
                st.write("**Original Image:**")
                st.image(image, use_column_width=True)
            
            with col_right:
                st.write("**Custom Model Detection:**")
                if best_model:
                    with st.spinner("🔄 Running best.pt inference..."):
                        ann, det, time_ms = run_inference(
                            best_model, image, conf_threshold, iou_threshold, filter_animals
                        )
                    st.image(ann, use_column_width=True)
                else:
                    st.error("❌ Custom model 'best.pt' not found.")
                    continue
            
            display_results(ann, det, time_ms, show_raw_data, "best.pt")

        elif model_choice == "Compare Both Models":
            tab1, tab2 = st.tabs(["📊 Side-by-Side", "📈 Comparison Details"])
            
            with tab1:
                col1, col2, col3 = st.columns(3)

                with col1:
                    st.write("**Original:**")
                    st.image(image, use_column_width=True)

                with col2:
                    st.write("**YOLOv8n:**")
                    with st.spinner("🔄 Running YOLOv8n..."):
                        ann1, det1, time_ms1 = run_inference(
                            yolov8n_model, image, conf_threshold, iou_threshold, filter_animals
                        )
                    st.image(ann1, use_column_width=True)

                with col3:
                    st.write("**best.pt:**")
                    if best_model:
                        with st.spinner("🔄 Running best.pt..."):
                            ann2, det2, time_ms2 = run_inference(
                                best_model, image, conf_threshold, iou_threshold, filter_animals
                            )
                        st.image(ann2, use_column_width=True)
                    else:
                        st.error("❌ best.pt not found.")
                        continue
            
            with tab2:
                col_a, col_b = st.columns(2)
                
                with col_a:
                    st.markdown("#### YOLOv8n Results")
                    display_results(ann1, det1, time_ms1, show_raw_data, "YOLOv8n")
                
                with col_b:
                    st.markdown("#### best.pt Results")
                    display_results(ann2, det2, time_ms2, show_raw_data, "best.pt")

        st.divider()


def about_section():
    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        with st.expander("📚 About This App"):
            st.write("""
            **WildSnap** is an AI-powered animal detection application built with:
            - YOLOv8 (Ultralytics)
            - Streamlit
            - Python
            
            Compare state-of-the-art vs custom models for wildlife detection.
            """)
    
    with col2:
        with st.expander("🚀 Features"):
            st.write("""
            ✓ Multi-image upload & processing
            ✓ Real-time bounding box detection
            ✓ Adjustable confidence & IoU thresholds
            ✓ Side-by-side model comparison
            ✓ Detailed detection statistics
            ✓ Raw data export
            """)
    
    with col3:
        with st.expander("💡 Tips"):
            st.write("""
            - Lower confidence = more detections
            - Higher IoU = stricter box overlap filtering
            - Use "Compare" mode to pick the best model
            - Enable "Show raw data" for coordinates
            """)
    
    st.caption("🐾 WildSnap © 2025 | Powered by YOLOv8")


if __name__ == "__main__":
    main_ui()
    about_section()
