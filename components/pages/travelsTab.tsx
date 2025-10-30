"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import TravelCard from "../TravelCard"
import { fetchActiveTravels, type TravelData } from "@/lib/api"

export default function TravelsTab() {
  const [date, setDate] = useState<Date>(new Date())
  const [travelsData, setTravelsData] = useState<TravelData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadTravels = async () => {
      setIsLoading(true)
      const dateString = format(date, "yyyy-MM-dd")
      const data = await fetchActiveTravels(dateString)
      setTravelsData(data)
      setIsLoading(false)
    }

    loadTravels()
  }, [date])

  const handlePreviousDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() - 1)
    setDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + 1)
    setDate(newDate)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousDay}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Selecciona una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextDay}
          className="h-10 w-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-12">
          Cargando viajes...
        </div>
      ) : travelsData.length === 0 ? (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-12">
          Ningún viaje encontrado para esta fecha
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {travelsData.map((travel, index) => (
            <TravelCard
              key={index}
              travelData={travel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

          
