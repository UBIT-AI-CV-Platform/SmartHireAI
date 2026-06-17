'use client'

import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'

interface ImageCropModalProps {
  imageSrc: string
  onCancel: () => void
  onCropped: (blob: Blob) => void | Promise<void>
}

export default function ImageCropModal({ imageSrc, onCancel, onCropped }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixels, setPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!pixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImg(imageSrc, pixels)
      await onCropped(blob)
    } catch (e) {
      alert('Could not crop the image. Please try another file.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={saving ? undefined : onCancel} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden auth-pop">
        <div className="p-5 border-b border-slate-100 text-center">
          <h3 className="text-lg font-bold text-on-surface">Crop your photo</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Drag to move, use the slider to zoom. Square only.</p>
        </div>

        {/* Cropper canvas */}
        <div className="relative h-72 sm:h-80 bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400 text-lg">zoom_out</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#3525cd] cursor-pointer"
            />
            <span className="material-symbols-outlined text-slate-600 text-2xl">zoom_in</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-on-surface font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !pixels}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Crop & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
