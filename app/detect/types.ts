export interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  width: number;
  height: number;
}

export interface DetectionResult {
  detections: Detection[];
  inference_time: number;
  image: string | null;
  object_count: number;
  avg_confidence: number;
}

export interface DetectionApiResponse {
  yolov8n?: DetectionResult;
  best?: DetectionResult;
  [key: string]: DetectionResult | undefined;
}
