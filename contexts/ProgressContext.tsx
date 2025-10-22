"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

type ProgressContextType = {
  progress: number
  setProgress: (progress: number | ((prev: number) => number)) => void
  isPlaying: boolean
  setIsPlaying: (isPlaying: boolean) => void
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <ProgressContext.Provider value={{ progress, setProgress, isPlaying, setIsPlaying }}>
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
