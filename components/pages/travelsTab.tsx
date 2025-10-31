"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download, // ✅ faltaba este import
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TravelCard from "../TravelCard";
import { fetchActiveTravels, type TravelData } from "@/lib/api";

// Helpers
function normalizeDate(input: Date | string) {
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = `${input.getMonth() + 1}`.padStart(2, "0");
    const d = `${input.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(input).slice(0, 10);
}

type AggKey =
  | "BARCELONA"
  | "VALÈNCIA"
  | "DÉNIA"
  | "IBIZA"
  | "IBIZA_SANT_ANTONI"
  | "FORMENTERA"
  | "MALLORCA"
  | "MALLORCA_ALCÚDIA"
  | "MENORCA"
  | "MENORCA_CIUTADELLA";

const ORIGIN_TO_AGG: Record<string, AggKey> = {
  OO01: "BARCELONA",
  OO04: "VALÈNCIA",
  OO06: "DÉNIA",
  OO05: "IBIZA",
  OO02: "IBIZA_SANT_ANTONI",
  OO11: "FORMENTERA",
  OO07: "MALLORCA",
  OO08: "MALLORCA_ALCÚDIA",
  OO10: "MENORCA",
  OO09: "MENORCA_CIUTADELLA",
};

const DESTINATION_TO_AGG: Record<string, AggKey> = {
  DD09: "BARCELONA",
  DD06: "VALÈNCIA",
  DD08: "DÉNIA",
  DD07: "IBIZA",
  DD14: "IBIZA_SANT_ANTONI",
  DD13: "FORMENTERA",
  DD01: "MALLORCA",
  DD11: "MALLORCA_ALCÚDIA",
  DD12: "MENORCA",
  DD10: "MENORCA_CIUTADELLA",
};

function buildStatsHref(travel: TravelData, day: Date | string) {
  const date = normalizeDate(day);
  const originKey = ORIGIN_TO_AGG[travel.origen] ?? "VALÈNCIA";
  const destinationKey = DESTINATION_TO_AGG[travel.destino] ?? "IBIZA";
  const shipCode = travel.codigo_buque ?? "SCA";

  return {
    pathname: "/",
    query: {
      tab: "page2",
      date,
      ship: shipCode,
      origin: originKey,
      destination: destinationKey,
    },
  } as const;
}

export default function TravelsTab() {
  const [date, setDate] = useState<Date>(new Date());
  const [travelsData, setTravelsData] = useState<TravelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTravels = async () => {
      try {
        setIsLoading(true);
        const data = await fetchActiveTravels(normalizeDate(date));
        if (!cancelled) setTravelsData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching travels:", err);
        if (!cancelled) setTravelsData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadTravels();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const handlePreviousDay = () => {
    const nd = new Date(date);
    nd.setDate(nd.getDate() - 1);
    setDate(nd);
  };

  const handleNextDay = () => {
    const nd = new Date(date);
    nd.setDate(nd.getDate() + 1);
    setDate(nd);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePreviousDay} className="h-10 w-10">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? date.toLocaleDateString() : <span>Selecciona una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={handleNextDay} className="h-10 w-10">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          Cargando viajes...
        </div>
      ) : travelsData.length === 0 ? (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          Ningún viaje encontrado para esta fecha
        </div>
      ) : (
        // ✅ envolver grid + botón en un único nodo (fragment)
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {travelsData.map((travel, idx) => {
              const href = buildStatsHref(travel, date);
              return (
                <Link key={idx} href={href} prefetch className="block">
                  <TravelCard travelData={travel} />
                </Link>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button asChild>
              <a href="/reporte.pdf" download="Informe_Balearia.pdf">
                <Download className="h-4 w-4 mr-2" />
                Descargar Informe
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
