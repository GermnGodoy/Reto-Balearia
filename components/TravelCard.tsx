import { DollarSign, Users, ArrowUp, ArrowDown } from "lucide-react"

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
  travel: Travel
  currentData: TimelineData
  previousData: TimelineData | null
}

export default function TravelCard({ travel, currentData, previousData }: TravelCardProps) {
  const profitDiff = previousData ? currentData.profit - previousData.profit : 0
  const peopleDiff = previousData ? currentData.people - previousData.people : 0

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-black shadow-sm hover:shadow-md transition-shadow relative">
      <div className="absolute top-4 right-4">
        <div
          className={`h-3 w-3 rounded-full ${
            currentData.isActive
              ? "bg-green-500"
              : "bg-red-500"
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
          {previousData && profitDiff !== 0 && (
            profitDiff > 0 ? (
              <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )
          )}
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-black dark:text-white">
            {currentData.people.toLocaleString()}
          </span>
          {previousData && peopleDiff !== 0 && (
            peopleDiff > 0 ? (
              <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
