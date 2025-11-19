'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 py-20">
        {/* Badge */}
        <div className="mb-12 flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="WildSnap Logo"
            width={60}
            height={60}
            className="w-16 h-16 rounded-full border-2 border-cyan-400"
          />
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">WildSnap</h2>
        </div>

        {/* Headline */}
        <h1 className="text-center text-5xl md:text-6xl font-bold mb-4">
          <span className="text-white">Detect Wildlife</span>
          <br />
          <span className="text-cyan-400">with AI Precision</span>
        </h1>

        {/* Description */}
        <p className="text-center text-gray-400 text-lg max-w-2xl mb-8">
          WildSnap uses cutting-edge computer vision to identify and locate animals in your images with unmatched accuracy
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/detect">
            <button className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full font-semibold transition-colors duration-200">
              Start Detecting
            </button>
          </Link>
          <button className="px-8 py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 rounded-full font-semibold transition-colors duration-200">
            Learn More
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          {/* Feature Card 1 */}
          <div className="border border-gray-700/50 rounded-lg p-6 bg-gray-900/30 hover:border-cyan-500/50 transition-colors duration-200">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-white font-semibold text-lg mb-2">Dual Model Support</h3>
            <p className="text-gray-400 text-sm">YOLOv8n and custom models for versatile detection</p>
          </div>

          {/* Feature Card 2 */}
          <div className="border border-gray-700/50 rounded-lg p-6 bg-gray-900/30 hover:border-cyan-500/50 transition-colors duration-200">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-white font-semibold text-lg mb-2">Real-Time Processing</h3>
            <p className="text-gray-400 text-sm">Instant results with adjustable confidence thresholds</p>
          </div>

          {/* Feature Card 3 */}
          <div className="border border-gray-700/50 rounded-lg p-6 bg-gray-900/30 hover:border-cyan-500/50 transition-colors duration-200">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-white font-semibold text-lg mb-2">Side-by-Side Comparison</h3>
            <p className="text-gray-400 text-sm">Compare model outputs to find the best results</p>
          </div>
        </div>
      </div>
    </main>
  )
}
