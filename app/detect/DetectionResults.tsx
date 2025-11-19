'use client'

import { DetectionApiResponse, DetectionResult } from './types'

interface DetectionResultsProps {
  results: DetectionApiResponse
  selectedModel: string
  onClear: () => void
}

export function DetectionResults({ results, selectedModel, onClear }: DetectionResultsProps) {
  const renderResult = (modelName: string, result: DetectionResult) => (
    <div key={modelName}>
      <h3 className="text-xl font-bold mb-2">{modelName}</h3>
      <p>Object Count: {result.object_count}</p>
      <p>Inference Time: {result.inference_time}ms</p>
      <ul className="mt-2">
        {result.detections.map((det, index) => (
          <li key={index}>
            {det.class}: {det.confidence.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="mt-4 p-4 rounded-lg border border-gray-700/50 bg-gray-900/20">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-white">Detection Results</h2>
        <button onClick={onClear} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
          Clear
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedModel === 'compare' ? (
          <>
            {results.yolov8n && renderResult('YOLOv8n', results.yolov8n)}
            {results.best && renderResult('Custom best.pt', results.best)}
          </>
        ) : (
          <>
            {results[selectedModel] && renderResult(selectedModel, results[selectedModel]!)}
          </>
        )}
      </div>
    </div>
  )
}
