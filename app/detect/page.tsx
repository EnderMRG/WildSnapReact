'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [inputMode, setInputMode] = useState<'upload' | 'webcam' | 'video'>('upload')
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [isStartingWebcam, setIsStartingWebcam] = useState(false)
  const [isLiveDetectionActive, setIsLiveDetectionActive] = useState(false)
  const [liveDetectionResults, setLiveDetectionResults] = useState<any>(null)
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [isVideoDetectionActive, setIsVideoDetectionActive] = useState(false)
  const [videoDetectionResults, setVideoDetectionResults] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoPlayerRef = useRef<HTMLVideoElement>(null)
  const videoCanvasRef = useRef<HTMLCanvasElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const isVideoProcessingRef = useRef(false)
  const isLiveDetectionActiveRef = useRef(false)
  const isVideoDetectionActiveRef = useRef(false)

  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
      }
      if (uploadedVideo) {
        URL.revokeObjectURL(uploadedVideo)
      }
    }
  }, [uploadedVideo])

  // Ensure video plays when stream is set
  useEffect(() => {
    if (videoRef.current && streamRef.current && isWebcamActive) {
      const video = videoRef.current
      const handleCanPlay = () => {
        video.play().catch(err => {
          console.error('Error playing video in useEffect:', err)
        })
      }
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('loadedmetadata', handleCanPlay)
      
      // Also try to play immediately
      if (video.readyState >= 2) {
        video.play().catch(console.error)
      }
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('loadedmetadata', handleCanPlay)
      }
    }
  }, [isWebcamActive, inputMode])

  // Auto-start webcam when switching to webcam mode
  useEffect(() => {
    if (inputMode === 'webcam' && !isWebcamActive && !isStartingWebcam) {
      // Small delay to ensure video element is fully rendered
      const timer = setTimeout(() => {
        if (videoRef.current) {
          startWebcam()
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [inputMode, isWebcamActive, isStartingWebcam])

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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (uploadedVideo) {
        URL.revokeObjectURL(uploadedVideo)
      }
      const videoUrl = URL.createObjectURL(file)
      setUploadedVideo(videoUrl)
      setVideoDetectionResults(null)
      setIsVideoDetectionActive(false)
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
        videoDetectionIntervalRef.current = null
      }
    }
  }

  const startWebcam = async () => {
    if (isStartingWebcam || isWebcamActive) {
      return // Already starting or active
    }

    setIsStartingWebcam(true)
    setError(null)

    // Wait for video element to be available
    let retries = 0
    while (!videoRef.current && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      retries++
    }

    if (!videoRef.current) {
      setError('Video element not available. Please try again.')
      console.error('Video ref not available after waiting')
      setIsStartingWebcam(false)
      return
    }

    try {
      // Try to get user media with flexible constraints
      const constraints = { 
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsWebcamActive(true)
        setError(null)
        
        // Wait a bit for the stream to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Ensure video plays
        try {
          await videoRef.current.play()
          console.log('Webcam started successfully')
          setIsStartingWebcam(false)
        } catch (playErr) {
          console.error('Error playing video:', playErr)
          // Try again after a short delay
          setTimeout(async () => {
            if (videoRef.current) {
              try {
                await videoRef.current.play()
                setIsStartingWebcam(false)
              } catch (e) {
                console.error('Retry play failed:', e)
                setIsStartingWebcam(false)
              }
            }
          }, 200)
        }
      }
    } catch (err) {
      // Try fallback with simpler constraints
      try {
        console.log('Trying fallback webcam constraints...')
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = fallbackStream
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream
          setIsWebcamActive(true)
          setError(null)
          
          await new Promise(resolve => setTimeout(resolve, 100))
          
          try {
            await videoRef.current.play()
            console.log('Webcam started with fallback constraints')
            setIsStartingWebcam(false)
          } catch (playErr) {
            console.error('Error playing video:', playErr)
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  await videoRef.current.play()
                  setIsStartingWebcam(false)
                } catch (e) {
                  console.error('Retry play failed:', e)
                  setIsStartingWebcam(false)
                }
              }
            }, 200)
          }
        }
      } catch (fallbackErr) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to access webcam'
        setError(`Webcam access denied or not available. ${errorMsg}`)
        console.error('Webcam error:', err)
        console.error('Fallback error:', fallbackErr)
        setIsWebcamActive(false)
        setIsStartingWebcam(false)
      }
    }
  }

  const stopWebcam = () => {
    stopLiveDetection()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsWebcamActive(false)
    setIsStartingWebcam(false)
  }

  // Sync ref with state
  useEffect(() => {
    isLiveDetectionActiveRef.current = isLiveDetectionActive
  }, [isLiveDetectionActive])

  useEffect(() => {
    isVideoDetectionActiveRef.current = isVideoDetectionActive
  }, [isVideoDetectionActive])

  // Stop live detection when webcam stops
  useEffect(() => {
    if (!isWebcamActive && isLiveDetectionActive) {
      stopLiveDetection()
    }
  }, [isWebcamActive])

  // Redraw detection results on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isLiveDetectionActive && liveDetectionResults) {
        drawDetectionResults(liveDetectionResults, videoRef.current, canvasRef.current, selectedModel)
      }
      if (isVideoDetectionActive && videoDetectionResults) {
        drawDetectionResults(videoDetectionResults, videoPlayerRef.current, videoCanvasRef.current, selectedModel)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isLiveDetectionActive, liveDetectionResults, isVideoDetectionActive, videoDetectionResults, selectedModel])

  const captureFromWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setUploadedImage(imageData)
        setDetectionResults(null)
        setError(null)
        stopWebcam()
        setInputMode('upload')
      }
    }
  }

  const handleDetect = async () => {
  if (!uploadedImage) return
  setIsLoading(true)
  setError(null)

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"

  try {
    // Convert base64 dataURL -> Blob -> File
    const res = await fetch(uploadedImage)
    const blob = await res.blob()
    const file = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("model", selectedModel)
    formData.append("confidence", confidence.toString())
    formData.append("iou", iouThreshold.toString())
    formData.append("filter_animals", filterAnimals.toString())

    const response = await fetch(`${backendUrl}/api/detect-file`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API Error: ${response.statusText}`)
    }

    const data = await response.json()
    setDetectionResults(data.results as any)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Detection failed"
    setError(
      `Failed to connect to the backend. Please ensure the backend server is running and accessible at ${backendUrl}. Details: ${errorMsg}`
    )
    console.error("Detection error:", err)
  } finally {
    setIsLoading(false)
  }
}


  const runLiveDetection = async () => {
    if (!videoRef.current || isProcessingRef.current) {
      return
    }

    const video = videoRef.current

    // Check if video is ready and has valid dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready:', { readyState: video.readyState, width: video.videoWidth, height: video.videoHeight })
      return
    }

    isProcessingRef.current = true

    try {
      // Capture frame from video
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = video.videoWidth
      tempCanvas.height = video.videoHeight
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) {
        isProcessingRef.current = false
        return
      }
      tempCtx.drawImage(video, 0, 0)
      const imageData = tempCanvas.toDataURL('image/jpeg', 0.8)

      // Run detection
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000'
      const response = await fetch(`${backendUrl}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          model: selectedModel,
          confidence: confidence,
          iou: iouThreshold,
          filter_animals: filterAnimals,
        }),
        mode: 'cors',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results) {
          setLiveDetectionResults(data.results)
          // Use setTimeout to ensure state is updated before drawing
          setTimeout(() => {
            drawDetectionResults(data.results, videoRef.current, canvasRef.current, selectedModel)
          }, 0)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Detection API error:', errorData)
      }
    } catch (err) {
      console.error('Live detection error:', err)
    } finally {
      isProcessingRef.current = false
    }
  }

  const drawDetectionResults = (
    results: any,
    videoElement: HTMLVideoElement | null,
    canvasElement: HTMLCanvasElement | null,
    modelKey: string
  ) => {
    if (!canvasElement || !videoElement) {
      console.log('Canvas or video ref not available')
      return
    }

    const canvas = canvasElement
    const video = videoElement
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('Could not get canvas context')
      return
    }

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions are zero')
      return
    }

    // Get video display dimensions
    const videoRect = video.getBoundingClientRect()
    if (videoRect.width === 0 || videoRect.height === 0) {
      console.log('Video rect dimensions are zero')
      return
    }

    const videoAspect = video.videoWidth / video.videoHeight
    const displayAspect = videoRect.width / videoRect.height

    let displayWidth, displayHeight, offsetX, offsetY

    if (videoAspect > displayAspect) {
      // Video is wider than display
      displayWidth = videoRect.width
      displayHeight = videoRect.width / videoAspect
      offsetX = 0
      offsetY = (videoRect.height - displayHeight) / 2
    } else {
      // Video is taller than display
      displayWidth = videoRect.height * videoAspect
      displayHeight = videoRect.height
      offsetX = (videoRect.width - displayWidth) / 2
      offsetY = 0
    }

    // Set canvas size to match video display
    canvas.width = videoRect.width
    canvas.height = videoRect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Get detection data
    const detectionData = results[modelKey] || results.yolov8n
    if (!detectionData || !detectionData.detections || detectionData.detections.length === 0) {
      return
    }

    // Scale factor from video dimensions to display dimensions
    const scaleX = displayWidth / video.videoWidth
    const scaleY = displayHeight / video.videoHeight

    // Draw bounding boxes
    detectionData.detections.forEach((detection: any) => {
      const { bbox, confidence: conf, class: className } = detection
      if (!bbox || bbox.length !== 4) return
      
      const [x1, y1, x2, y2] = bbox

      // Scale coordinates to display size
      const scaledX1 = x1 * scaleX + offsetX
      const scaledY1 = y1 * scaleY + offsetY
      const scaledX2 = x2 * scaleX + offsetX
      const scaledY2 = y2 * scaleY + offsetY
      const width = scaledX2 - scaledX1
      const height = scaledY2 - scaledY1

      // Draw bounding box
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 3
      ctx.strokeRect(scaledX1, scaledY1, width, height)

      // Draw label background
      const label = `${className} ${(conf * 100).toFixed(1)}%`
      ctx.font = 'bold 14px Arial'
      const textMetrics = ctx.measureText(label)
      const labelWidth = textMetrics.width + 10
      const labelHeight = 20

      ctx.fillStyle = '#00ffff'
      ctx.fillRect(scaledX1, scaledY1 - labelHeight, labelWidth, labelHeight)

      // Draw label text
      ctx.fillStyle = '#000000'
      ctx.fillText(label, scaledX1 + 5, scaledY1 - 5)
    })
  }

  const startLiveDetection = () => {
    if (!isWebcamActive || isLiveDetectionActive) {
      console.log('Cannot start live detection:', { isWebcamActive, isLiveDetectionActive })
      return
    }

    console.log('Starting live detection...')
    setIsLiveDetectionActive(true)
    isLiveDetectionActiveRef.current = true
    setLiveDetectionResults(null)

    // Wait a bit for video to be ready, then start detection
    setTimeout(() => {
      if (isWebcamActive && videoRef.current && isLiveDetectionActiveRef.current) {
        console.log('Setting up detection interval')
        // Run detection every 500ms (2 FPS for detection)
        detectionIntervalRef.current = setInterval(() => {
          if (isLiveDetectionActiveRef.current && isWebcamActive && videoRef.current) {
            runLiveDetection()
          } else {
            console.log('Skipping detection:', { 
              isLiveActive: isLiveDetectionActiveRef.current, 
              isWebcamActive, 
              hasVideo: !!videoRef.current 
            })
          }
        }, 500)
        // Run first detection immediately
        console.log('Running first detection')
        runLiveDetection()
      } else {
        console.log('Cannot start interval:', { 
          isWebcamActive, 
          hasVideo: !!videoRef.current, 
          isLiveActive: isLiveDetectionActiveRef.current 
        })
      }
    }, 500)
  }

  const stopLiveDetection = () => {
    setIsLiveDetectionActive(false)
    isLiveDetectionActiveRef.current = false
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    setLiveDetectionResults(null)
  }

  const runVideoDetection = async () => {
    if (!videoPlayerRef.current || isVideoProcessingRef.current) {
      return
    }

    const video = videoPlayerRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    isVideoProcessingRef.current = true

    try {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = video.videoWidth
      tempCanvas.height = video.videoHeight
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) {
        isVideoProcessingRef.current = false
        return
      }
      tempCtx.drawImage(video, 0, 0)
      const imageData = tempCanvas.toDataURL('image/jpeg', 0.8)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000'
      const response = await fetch(`${backendUrl}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          model: selectedModel,
          confidence: confidence,
          iou: iouThreshold,
          filter_animals: filterAnimals,
        }),
        mode: 'cors',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results) {
          setVideoDetectionResults(data.results)
          drawDetectionResults(data.results, videoPlayerRef.current, videoCanvasRef.current, selectedModel)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Video detection API error:', errorData)
      }
    } catch (err) {
      console.error('Video detection error:', err)
    } finally {
      isVideoProcessingRef.current = false
    }
  }

  const startVideoDetection = () => {
    if (!uploadedVideo || !videoPlayerRef.current || isVideoDetectionActive) return

    setIsVideoDetectionActive(true)
    isVideoDetectionActiveRef.current = true
    setVideoDetectionResults(null)

    // Ensure video is playing
    videoPlayerRef.current.play().catch(() => null)

    // Run detection every 500ms
    videoDetectionIntervalRef.current = setInterval(() => {
      if (
        isVideoDetectionActiveRef.current &&
        videoPlayerRef.current &&
        !videoPlayerRef.current.paused &&
        !videoPlayerRef.current.ended
      ) {
        runVideoDetection()
      }
    }, 500)

    runVideoDetection()
  }

  const stopVideoDetection = () => {
    setIsVideoDetectionActive(false)
    isVideoDetectionActiveRef.current = false
    if (videoDetectionIntervalRef.current) {
      clearInterval(videoDetectionIntervalRef.current)
      videoDetectionIntervalRef.current = null
    }
    if (videoCanvasRef.current) {
      const ctx = videoCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, videoCanvasRef.current.width, videoCanvasRef.current.height)
      }
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
              className="w-14 h-14 rounded-full border-2 border-cyan-400 shrink-0"
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

        {/* Input Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              if (isWebcamActive) {
                stopWebcam()
              }
              stopVideoDetection()
              setInputMode('upload')
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              inputMode === 'upload'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📁 Upload Image
          </button>
          <button
            onClick={() => {
              setInputMode('webcam')
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              inputMode === 'webcam'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📷 Webcam
          </button>
          <button
            onClick={() => {
              if (isWebcamActive) {
                stopWebcam()
              }
              setInputMode('video')
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              inputMode === 'video'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🎞️ Video
          </button>
        </div>

        {/* Upload Area / Webcam Display */}
        <div className="flex-1 rounded-xl border-2 border-dashed border-gray-700/50 bg-gray-900/20 hover:border-cyan-500/30 transition-colors flex flex-col items-center justify-center cursor-pointer group relative">
          {inputMode === 'webcam' ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[400px] bg-black/20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full max-w-full max-h-full object-contain rounded-xl bg-black ${isWebcamActive ? '' : 'hidden'}`}
                style={{ minHeight: '400px', minWidth: '100%' }}
              />
              {/* Canvas overlay for detection results */}
              {isWebcamActive && (
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ 
                    zIndex: 1,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
              {!isWebcamActive && (
                <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl mb-4">📷</div>
                  <p className="text-gray-400 font-medium mb-2">
                    {isStartingWebcam ? 'Starting webcam...' : 'Webcam not active'}
                  </p>
                  {!isStartingWebcam && (
                    <button
                      onClick={startWebcam}
                      className="mt-4 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Start Webcam
                    </button>
                  )}
                  {isStartingWebcam && (
                    <div className="mt-4 px-6 py-3 text-cyan-400">
                      <div className="animate-spin">⏳</div>
                    </div>
                  )}
                </div>
              )}
              {isWebcamActive && (
                <>
                  {/* Live Detection Stats */}
                  {isLiveDetectionActive && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg z-20">
                      <div className="text-sm font-semibold text-cyan-400 mb-1 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Detection
                      </div>
                      {liveDetectionResults ? (() => {
                        const detectionData = liveDetectionResults[selectedModel] || liveDetectionResults.yolov8n
                        return detectionData ? (
                          <div className="text-xs">
                            <div>Objects: <span className="text-cyan-400 font-bold">{detectionData.object_count || 0}</span></div>
                            <div>Confidence: <span className="text-cyan-400 font-bold">{((detectionData.avg_confidence || 0) * 100).toFixed(1)}%</span></div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Processing...</div>
                        )
                      })() : (
                        <div className="text-xs text-gray-400">Initializing...</div>
                      )}
                    </div>
                  )}
                  {/* Control Buttons */}
                  <div className="absolute bottom-4 flex gap-3 z-10 flex-wrap justify-center">
                    <button
                      onClick={stopWebcam}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                    >
                      Stop Webcam
                    </button>
                    {!isLiveDetectionActive ? (
                      <button
                        onClick={startLiveDetection}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                      >
                        🎯 Start Live Detection
                      </button>
                    ) : (
                      <button
                        onClick={stopLiveDetection}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                      >
                        ⏸️ Stop Detection
                      </button>
                    )}
                    <button
                      onClick={captureFromWebcam}
                      className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors shadow-lg"
                    >
                      📸 Capture Image
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : inputMode === 'video' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 min-h-[400px]">
              {!uploadedVideo ? (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  <div className="text-center">
                    <div className="text-5xl mb-4">🎞️</div>
                    <p className="text-gray-400 font-medium mb-2">Drop or select a video to analyze</p>
                    <p className="text-gray-500 text-sm">Supports MP4, MOV, WebM</p>
                  </div>
                </label>
              ) : (
                <div className="relative w-full max-h-[600px] bg-black rounded-xl overflow-hidden">
                  <video
                    ref={videoPlayerRef}
                    src={uploadedVideo}
                    controls
                    onEnded={stopVideoDetection}
                    className="w-full h-full object-contain bg-black rounded-xl"
                  />
                  <canvas
                    ref={videoCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ zIndex: 1, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-3 z-10">
                    {!isVideoDetectionActive ? (
                      <button
                        onClick={startVideoDetection}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                      >
                        🎯 Start Video Detection
                      </button>
                    ) : (
                      <button
                        onClick={stopVideoDetection}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                      >
                        ⏸️ Stop Video Detection
                      </button>
                    )}
                    <label className="px-6 py-3 bg-gray-700/70 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors shadow-lg cursor-pointer">
                      Change Video
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  </div>
                  {isVideoDetectionActive && (
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg z-20">
                      <div className="text-sm font-semibold text-cyan-400 mb-1 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Video Detection
                      </div>
                      {videoDetectionResults ? (() => {
                        const detectionData = videoDetectionResults[selectedModel] || videoDetectionResults.yolov8n
                        return detectionData ? (
                          <div className="text-xs">
                            <div>Objects: <span className="text-cyan-400 font-bold">{detectionData.object_count || 0}</span></div>
                            <div>Confidence: <span className="text-cyan-400 font-bold">{((detectionData.avg_confidence || 0) * 100).toFixed(1)}%</span></div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Processing...</div>
                        )
                      })() : (
                        <div className="text-xs text-gray-400">Initializing...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
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
          )}
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

        {/* Video Detection Results */}
        {videoDetectionResults && inputMode === 'video' && (
          <div className="mt-8 p-6 rounded-lg border border-green-500/30 bg-green-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Video Detection Snapshot</h3>
              <button
                onClick={() => setVideoDetectionResults(null)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Objects Detected</p>
                <p className="text-green-400 text-2xl font-bold">
                  {(videoDetectionResults[selectedModel]?.object_count) ??
                    videoDetectionResults.yolov8n?.object_count ??
                    0}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Average Confidence</p>
                <p className="text-green-400 text-2xl font-bold">
                  {(
                    ((videoDetectionResults[selectedModel]?.avg_confidence ??
                      videoDetectionResults.yolov8n?.avg_confidence ??
                      0) * 100)
                  ).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Inference Time</p>
                <p className="text-green-400 text-xl font-bold">
                  {videoDetectionResults[selectedModel]?.inference_time ??
                    videoDetectionResults.yolov8n?.inference_time ??
                    0}
                  ms
                </p>
              </div>
            </div>
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

        {videoDetectionResults && inputMode === 'video' && (
          <div className="mt-4 p-4 rounded-lg border border-gray-700/50 bg-gray-900/20 max-h-64 overflow-y-auto">
            <p className="text-gray-300 font-semibold mb-3 text-sm">📋 Raw Video Detection Data:</p>
            <div className="bg-black/40 rounded p-3 overflow-x-auto">
              <pre className="text-green-400 text-xs font-mono leading-relaxed whitespace-pre-wrap break-word">
{JSON.stringify(videoDetectionResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
