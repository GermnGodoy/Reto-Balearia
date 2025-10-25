"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

type ProgressContextType = {
  progress: number
  setProgress: (progress: number | ((prev: number) => number)) => void
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void
  // NEW
  routeDate: string             // YYYY-MM-DD that auto-updates when progress changes
  bumpProgress: () => void      // convenient +1 helper (optional)
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

// NEW: base date + tiny util
const BASE_YMD = "2025-08-15"
const addDays = (ymd: string, n: number) => {
  const d = new Date(ymd + "T00:00:00")
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // NEW: routeDate is derived from progress — no extra effects needed
  const routeDate = addDays(BASE_YMD, Math.floor(progress))
  const bumpProgress = () => setProgress((p) => p + 1)

  return (
    <ProgressContext.Provider
      value={{ progress, setProgress, isPlaying, setIsPlaying, routeDate, bumpProgress }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider")
  }
  return context
}
