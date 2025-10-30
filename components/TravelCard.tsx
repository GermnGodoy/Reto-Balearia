"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { DollarSign, Users, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from "lucide-react";
import { getTrendLevel, type TrendLevel } from "@/lib/travelThresholds";

type TimelineData = {
  progress: number;
  profit: number;
  people: number;
  predictedProfit: number;
  predictedPeople: number;
  profitError: number;
  peopleError: number;
  isActive: boolean;
};

type Travel = {
  name: string;
  description: string;
  timeline: TimelineData[];
};

type ApiTravelData = {
  trayecto: string;
  avg_demand?: number;
  price?: number;
  origen?: string;
  destino?: string;
  fecha_salida?: string | Date;
  fecha_reserva?: string | Date;
  codigo_buque?: string;
  avg_volumen_grupo?: number;
  avg_precio_medio_producto?: number;
  [key: string]: unknown;
};

type TravelCardProps = {
  travel?: Travel;
  currentData?: TimelineData;
  previousData?: TimelineData | null;
  travelData?: ApiTravelData;
};

const ORIGIN_TO_AGG: Record<string, string> = {
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

const DESTINATION_TO_AGG: Record<string, string> = {
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

const FALLBACK_ORIGIN = "VALÈNCIA";
const FALLBACK_DESTINATION = "IBIZA";

function normalizeDate(input: string | Date | undefined): string {
  if (!input) return normalizeDate(new Date());
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(input).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s.slice(0, 10);
}

function TrendIndicator({ level }: { level: TrendLevel }) {
  const iconClass = "h-3.5 w-3.5";

  switch (level) {
    case "very-low":
      return <ChevronsDown className={`${iconClass} text-red-600 dark:text-red-400`} />;
    case "low":
      return <ChevronDown className={`${iconClass} text-orange-600 dark:text-orange-400`} />;
    case "medium":
      return <Minus className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />;
    case "high":
      return <ChevronUp className={`${iconClass} text-green-600 dark:text-green-400`} />;
    case "very-high":
      return <ChevronsUp className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
    default:
      return null;
  }
}

export default function TravelCard({ travel, currentData, previousData, travelData }: TravelCardProps) {
  const router = useRouter();

  if (travelData) {
    const originLabel = typeof travelData.origen === "string" ? travelData.origen : "";
    const destinationLabel = typeof travelData.destino === "string" ? travelData.destino : "";
    const name =
      originLabel && destinationLabel
        ? `${originLabel} ➜ ${destinationLabel}`
        : (typeof travelData.trayecto === "string" && travelData.trayecto) || "Unknown Route";

    const demand =
      typeof travelData.avg_volumen_grupo === "number"
        ? travelData.avg_volumen_grupo
        : typeof travelData.avg_demand === "number"
        ? travelData.avg_demand
        : 0;

    const price =
      typeof travelData.avg_precio_medio_producto === "number"
        ? travelData.avg_precio_medio_producto
        : typeof travelData.price === "number"
        ? travelData.price
        : 0;

    const demandLevel = getTrendLevel(demand, "demand");
    const priceLevel = getTrendLevel(price, "price");

    const normalizedDate = normalizeDate(
      (travelData.fecha_salida as string | Date | undefined) ?? travelData.fecha_reserva
    );
    const originKey = ORIGIN_TO_AGG[originLabel] ?? FALLBACK_ORIGIN;
    const destinationKey = DESTINATION_TO_AGG[destinationLabel] ?? FALLBACK_DESTINATION;
    const shipCode =
      typeof travelData.codigo_buque === "string" && travelData.codigo_buque.trim().length
        ? travelData.codigo_buque
        : "SCA";

    const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("button")) return;
      if ((event.currentTarget as HTMLElement).closest("a")) return;

      const params = new URLSearchParams({
        tab: "page2",
        date: normalizedDate,
        ship: shipCode,
        origin: originKey,
        destination: destinationKey,
      });

      router.push(`/?${params.toString()}`);
    };

    return (
      <div
        className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-black shadow-sm hover:shadow-md transition-shadow relative cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="absolute top-4 right-4">
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2 pr-6 text-black dark:text-white">{name}</h3>
        <div className="flex justify-between items-center gap-4 text-sm mt-6">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-black dark:text-white">
              {Math.round(price).toLocaleString()}
            </span>
            <TrendIndicator level={priceLevel} />
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-black dark:text-white">
              {Math.round(demand).toLocaleString()}
            </span>
            <TrendIndicator level={demandLevel} />
          </div>
        </div>
      </div>
    );
  }

  if (travel && currentData) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-black shadow-sm hover:shadow-md transition-shadow relative">
        <div className="absolute top-4 right-4">
          <div
            className={`h-3 w-3 rounded-full ${
              currentData.isActive ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>
        <h3 className="font-semibold text-lg mb-2 pr-6 text-black dark:text-white">{travel.name}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{travel.description}</p>
        <div className="flex justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-black dark:text-white">
              {currentData.profit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-black dark:text-white">
              {currentData.people.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
