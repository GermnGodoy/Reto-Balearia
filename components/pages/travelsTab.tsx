import { DollarSign, Users, ArrowUp, ArrowDown } from "lucide-react"

import { getCurrentTravelData, getPreviousTravelData } from "@/functions/db"
import { useTravels } from "@/contexts/travelsContext"
import TravelCard from "../TravelCard"

import { useProgress } from "@/contexts/ProgressContext"

export default function TravelsTab() {
  const { progress } = useProgress()
  const { travels: travelsData } = useTravels()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
      {travelsData.map((travel, index) => (
        <TravelCard
          key={index}
          travel={travel}
          currentData={getCurrentTravelData(travel, progress)}
          previousData={getPreviousTravelData(travel, progress)}
        />
      ))}
    </div>
  )
}

          
