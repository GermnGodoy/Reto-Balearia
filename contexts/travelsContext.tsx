// src/contexts/travelsContext.tsx
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import travelsDataJson from "@/data/travels.json";

export type TimelineEntry = {
  progress: number;
  isActive: boolean;
  profit: number;
  people: number;
  predictedProfit: number;
  profitError: number;
  predictedPeople: number;
  peopleError: number;
};

export type Travel = {
  name: string;
  description: string;
  timeline: TimelineEntry[];
};

type TravelsContextType = {
  travels: Travel[];
};

const TravelsContext = createContext<TravelsContextType | undefined>(undefined);

// 👇 NUEVO: `travels` es opcional. Si lo pasas, se usa; si no, cae a travels.json
export function TravelsProvider({
  children,
  travels: travelsOverride,
}: {
  children: ReactNode;
  travels?: Travel[];
}) {
  const travels = (travelsOverride ?? (travelsDataJson as Travel[])) as Travel[];
  return <TravelsContext.Provider value={{ travels }}>{children}</TravelsContext.Provider>;
}

export function useTravels() {
  const context = useContext(TravelsContext);
  if (context === undefined) {
    throw new Error("useTravels must be used within a TravelsProvider");
  }
  return context;
}
