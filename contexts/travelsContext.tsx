"use client"

import React, { createContext, useContext, ReactNode } from "react"
import travelsDataJson from "@/data/travels.json"

type TimelineEntry = {
  progress: number
  isActive: boolean
  profit: number
  people: number
  predictedProfit: number
  profitError: number
  predictedPeople: number
  peopleError: number
}

type Travel = {
  name: string
  description: string
  timeline: TimelineEntry[]
}

type TravelsContextType = {
  travels: Travel[]
}

const TravelsContext = createContext<TravelsContextType | undefined>(undefined)

export function TravelsProvider({ children }: { children: ReactNode }) {
  const travels = travelsDataJson as Travel[]

  return (
    <TravelsContext.Provider value={{ travels }}>
      {children}
    </TravelsContext.Provider>
  )
}

export function useTravels() {
  const context = useContext(TravelsContext)
  if (context === undefined) {
    throw new Error("useTravels must be used within a TravelsProvider")
  }
  return context
}
