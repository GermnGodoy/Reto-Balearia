import { DollarSign, Users, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from "lucide-react"
import { getTrendLevel, type TrendLevel } from "@/lib/travelThresholds"

type TimelineData = {
  progress: number
  profit: number
  people: number
  predictedProfit: number
  predictedPeople: number
  profitError: number
  peopleError: number
  isActive: boolean
}

type Travel = {
  name: string
  description: string
  timeline: TimelineData[]
}

type TravelCardProps = {
  travel?: Travel
  currentData?: TimelineData
  previousData?: TimelineData | null
  travelData?: {
    trayecto: string
    avg_demand?: number
    price?: number
    [key: string]: any
  }
}

function TrendIndicator({ level }: { level: TrendLevel }) {
  const iconClass = "h-3.5 w-3.5"

  switch (level) {
    case 'very-low':
      return <ChevronsDown className={`${iconClass} text-red-600 dark:text-red-400`} />
    case 'low':
      return <ChevronDown className={`${iconClass} text-orange-600 dark:text-orange-400`} />
    case 'medium':
      return <Minus className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />
    case 'high':
      return <ChevronUp className={`${iconClass} text-green-600 dark:text-green-400`} />
    case 'very-high':
      return <ChevronsUp className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />
  }
}

export default function TravelCard({ travel, currentData, previousData, travelData }: TravelCardProps) {
  // Support both old and new data structures
  if (travelData) {
    // New API data structure
    const isActive = true // If we have data, it's active
    const name = travelData.origen.concat(" ➜ ", travelData.destino) || "Unknown Route"
    const demand = travelData.avg_volumen_grupo || 0
    const price = travelData.avg_precio_medio_producto || 0

    const demandLevel = getTrendLevel(demand, 'demand')
    const priceLevel = getTrendLevel(price, 'price')

    return (
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-black shadow-sm hover:shadow-md transition-shadow relative">
        <div className="absolute top-4 right-4">
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2 pr-6 text-black dark:text-white">
          {name}
        </h3>
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
    )
  }

  // Old data structure (for other tabs that still use it)
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
        <h3 className="font-semibold text-lg mb-2 pr-6 text-black dark:text-white">
          {travel.name}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {travel.description}
        </p>
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
    )
  }

  return null
}
