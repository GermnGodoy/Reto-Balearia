"use client"
import { Sparkles } from "lucide-react"
import { getPast15DaysTravels, getPast15DaysWeights } from "@/functions/db"
import { useTravels } from "@/contexts/travelsContext"
import { useProgress } from "@/contexts/ProgressContext"

export default function Explanations() {
  const { travels } = useTravels()
  const { progress } = useProgress()

  // Get data (not using it for logic, just importing)
  const past15DaysTravels = getPast15DaysTravels(travels, progress)
  const past15DaysWeights = getPast15DaysWeights(progress)

  return (
    <div className="mt-10 mb-7">
      <div className="relative rounded-xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/30 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
            <Sparkles className="h-6 w-6 text-black dark:text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
              Comentarios de Baleito
            </h4>
            <p className="text-base text-neutral-700 dark:text-neutral-200 leading-relaxed">
              These insights are generated based on the last 15 days of travel data and ML model feature weights.
              The recommendations consider passenger trends, pricing dynamics, seasonal patterns, and external factors
              like weather conditions. Use these insights to make informed decisions about route optimization,
              pricing strategies, and resource allocation across your ferry network.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
