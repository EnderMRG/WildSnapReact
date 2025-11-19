'use client'

import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import Link from 'next/link'
import Image from 'next/image'

export default function DetectPage() {
  const [selectedModel, setSelectedModel] = useState('yolov8n')
  const [confidence, setConfidence] = useState(0.40)
  const [iouThreshold, setIouThreshold] = useState(0.50)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [filterAnimals, setFilterAnimals] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [detectionResults, setDetectionResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setDetectionResults(null)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDetect = async () => {
    if (!uploadedImage) return
    setIsLoading(true)
    setError(null)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000'

    try {
      const response = await fetch(`${backendUrl}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: uploadedImage,
          model: selectedModel,
          confidence: confidence,
          iou: iouThreshold,
          filter_animals: filterAnimals,
        }),
        mode: 'cors',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.statusText}`)
      }

      const data = await response.json()
      setDetectionResults(data.results as any)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Detection failed'
      setError(`Failed to connect to the backend. Please ensure the backend server is running and accessible at ${backendUrl}. Details: ${errorMsg}`)
      console.error('Detection error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-row">
      {/* Left Sidebar */}
      <div className="w-80 shrink-0 border-r border-gray-700/50 p-6 overflow-y-auto bg-slate-900/40">
        <Link href="/">
          <div className="mb-8 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="WildSnap Logo"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full border-2 border-cyan-400 flex-shrink-0"
            />
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">WildSnap</h1>
              <p className="text-gray-400 text-xs">Animal Detection Studio</p>
            </div>
          </div>
        </Link>

        {/* Configuration Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-white font-semibold text-lg">Configuration</h2>
          </div>

          {/* Detection Settings */}
          <div className="mb-6 p-4 rounded-lg border border-gray-700/50 bg-gray-900/20">
            
            {/* Confidence Threshold */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-white font-semibold mb-4">Confidence Threshold</label>
                <span className="text-cyan-400 font-bold text-sm">{confidence.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>0.00</span>
                <span>1.00</span>
              </div>
            </div>

            {/* IoU Threshold */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-white text-sm font-medium">IoU Threshold</label>
                <span className="text-cyan-400 font-bold text-sm">{iouThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={iouThreshold}
                onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>0.00</span>
                <span>1.00</span>
              </div>
            </div>
          </div>

          {/* Output Options */}
          <div className="mb-6 p-4 rounded-lg border border-gray-700/50 bg-gray-900/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm">📤</span>
              <h3 className="text-white font-semibold">Output Options</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAnimals}
                  onChange={(e) => setFilterAnimals(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700/50 bg-gray-900 accent-red-500"
                />
                <span className="text-gray-300 text-sm">
                  Filter for animal classes
                  <br />
                  <span className="text-gray-500 text-xs">(YOLOv8n only)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-8">
          <h2 className="text-white font-semibold mb-4">Detection Models</h2>
          
          <RadioGroup value={selectedModel} onValueChange={setSelectedModel} className="space-y-3">
            <label className="flex items-center p-3 rounded-lg border border-gray-700/50 hover:border-cyan-500/30 cursor-pointer transition-colors">
              <RadioGroupItem value="yolov8n" id="yolov8n" className="w-4 h-4" />
              <span className="ml-3 flex-1">
                <div className="text-white font-medium">YOLOv8n</div>
                <div className="text-gray-400 text-xs">Nano - Lightweight</div>
              </span>
            </label>

            <label className="flex items-center p-3 rounded-lg border border-gray-700/50 hover:border-cyan-500/30 cursor-pointer transition-colors">
              <RadioGroupItem value="best" id="best" className="w-4 h-4" />
              <span className="ml-3 flex-1">
                <div className="text-white font-medium">Custom Model</div>
                <div className="text-gray-400 text-xs">Personally trained model</div>
              </span>
            </label>

            <label className="flex items-center p-3 rounded-lg border border-gray-700/50 hover:border-cyan-500/30 cursor-pointer transition-colors">
              <RadioGroupItem value="compare" id="compare" className="w-4 h-4" />
              <span className="ml-3 flex-1">
                <div className="text-white font-medium">Compare</div>
                <div className="text-gray-400 text-xs">Compares Both the Models</div>
              </span>
            </label>
          </RadioGroup>
        </div>
        </div>
      </div>

      {/* Right Main Content */}
      <div className="flex-1 p-8 flex flex-col overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Detection Tool</h2>
          <p className="text-gray-400">{isLoading ? '⏳ Running detection...' : 'Ready for detection'}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-lg border border-red-500/50 bg-red-500/10">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Upload Area */}
        <div className="flex-1 rounded-xl border-2 border-dashed border-gray-700/50 bg-gray-900/20 hover:border-cyan-500/30 transition-colors flex flex-col items-center justify-center cursor-pointer group relative">
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            {uploadedImage && !detectionResults ? (
              <div className="relative w-full h-full">
                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="text-white font-semibold">Change Image</span>
                </div>
              </div>
            ) : detectionResults ? (
              <div className="relative w-full h-full overflow-auto">
                {selectedModel === 'compare' ? (
                  <div className="flex h-full gap-4 p-4">
                    {detectionResults.yolov8n?.image && (
                      <div className="flex-1 flex flex-col">
                        <p className="text-cyan-400 text-sm font-semibold mb-2">YOLOv8n Results</p>
                        <img src={detectionResults.yolov8n.image} alt="YOLOv8n Detection" className="flex-1 object-contain" />
                      </div>
                    )}
                    {detectionResults.best?.image && (
                      <div className="flex-1 flex flex-col">
                        <p className="text-cyan-400 text-sm font-semibold mb-2">Custom best.pt Results</p>
                        <img src={detectionResults.best.image} alt="Custom Detection" className="flex-1 object-contain" />
                      </div>
                    )}
                  </div>
                ) : (
                  <img src={detectionResults[selectedModel]?.image || detectionResults.yolov8n?.image} alt="Detection Result" className="w-full h-full object-contain" />
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-4">📸</div>
                <p className="text-gray-400 font-medium mb-2">Drop or select an image to begin detection</p>
                <p className="text-gray-500 text-sm">Supports JPG, PNG, WebP</p>
              </div>
            )}
          </label>
        </div>

        {/* Detect Button */}
        {uploadedImage && !detectionResults && (
          <button
            onClick={handleDetect}
            disabled={isLoading}
            className="mt-4 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            {isLoading ? '🔄 Running Detection...' : '🚀 Start Detection'}
          </button>
        )}

        {/* Detection Results Area */}
        {detectionResults && (
          <div className="mt-8 p-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Detection Results</h3>
              <button
                onClick={() => setDetectionResults(null)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>

            {selectedModel === 'compare' ? (
              <div className="grid grid-cols-2 gap-4">
                {detectionResults.yolov8n && (
                  <div className="border border-gray-700/50 rounded p-3">
                    <p className="text-cyan-400 text-sm font-semibold mb-2">YOLOv8n</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Objects Detected:</span>
                        <span className="text-white font-bold">{detectionResults.yolov8n.object_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Confidence:</span>
                        <span className="text-white font-bold">{(detectionResults.yolov8n.avg_confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Inference Time:</span>
                        <span className="text-white font-bold">{detectionResults.yolov8n.inference_time}ms</span>
                      </div>
                    </div>
                  </div>
                )}
                {detectionResults.best && (
                  <div className="border border-gray-700/50 rounded p-3">
                    <p className="text-cyan-400 text-sm font-semibold mb-2">Custom best.pt</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Objects Detected:</span>
                        <span className="text-white font-bold">{detectionResults.best.object_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Confidence:</span>
                        <span className="text-white font-bold">{(detectionResults.best.avg_confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Inference Time:</span>
                        <span className="text-white font-bold">{detectionResults.best.inference_time}ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Objects Detected</p>
                  <p className="text-cyan-400 text-2xl font-bold">{detectionResults[selectedModel]?.object_count || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Average Confidence</p>
                  <p className="text-cyan-400 text-2xl font-bold">{((detectionResults[selectedModel]?.avg_confidence || 0) * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Inference Time</p>
                  <p className="text-cyan-400 text-xl font-bold">{detectionResults[selectedModel]?.inference_time}ms</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raw Data Display - Always show when results available */}
        {detectionResults && (
          <div className="mt-4 p-4 rounded-lg border border-gray-700/50 bg-gray-900/20 max-h-64 overflow-y-auto">
            <p className="text-gray-300 font-semibold mb-3 text-sm">📋 Raw Detection Data:</p>
            <div className="bg-black/40 rounded p-3 overflow-x-auto">
              <pre className="text-green-400 text-xs font-mono leading-relaxed whitespace-pre-wrap break-word">
{JSON.stringify(detectionResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
