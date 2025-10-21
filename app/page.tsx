"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward, DollarSign, Users, ArrowUp, ArrowDown } from "lucide-react"
import travelsData from "@/data/travels.json"

export default function Home() {
  // Progreso (esto seria el tiempo que se podria pillar segun los dias del dataset)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const getCurrentTravelData = (travel: typeof travelsData[0]) => {
    const roundedProgress = Math.round(progress)
    return travel.timeline.find(t => t.progress === roundedProgress) || travel.timeline[0]
  }

  const getPreviousTravelData = (travel: typeof travelsData[0]) => {
    const roundedProgress = Math.round(progress)
    if (roundedProgress === 0) return null
    return travel.timeline.find(t => t.progress === roundedProgress - 1) || null
  }

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 2
          if (newProgress >= 100) {
            setIsPlaying(false)
            return 100
          }
          return newProgress
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isPlaying])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setProgress(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div className="h-screen flex flex-col">
      <Tabs defaultValue="page1" className="flex-1 flex flex-col gap-0">
        <div className="bg-neutral-100 dark:bg-neutral-950">
          <TabsList className="bg-transparent h-auto p-0 gap-1 flex w-full mt-1">
            <TabsTrigger
              value="page1"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 text-sm border-none transition-all"
            >
              Map
            </TabsTrigger>
            <TabsTrigger
              value="page2"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 text-sm border-none transition-all"
            >
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="page3"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 border-none text-sm transition-all"
            >
              Travels
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="page1"
          className="flex-1 bg-white dark:bg-black m-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        />
        <TabsContent
          value="page2"
          className="flex-1 bg-white dark:bg-black m-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        />
        <TabsContent
          value="page3"
          className="flex-1 bg-white dark:bg-black m-0 overflow-auto p-6 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {travelsData.map((travel, index) => {
              const currentData = getCurrentTravelData(travel)
              const previousData = getPreviousTravelData(travel)

              const profitDiff = previousData ? currentData.profit - previousData.profit : 0
              const peopleDiff = previousData ? currentData.people - previousData.people : 0

              return (
                <div
                  key={index}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-black shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="absolute top-4 right-4">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        currentData.isActive
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 pr-6 text-black dark:text-white">{travel.name}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    {travel.description}
                  </p>
                  <div className="flex justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-black dark:text-white">{currentData.profit.toLocaleString()}</span>
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
                      <span className="font-medium text-black dark:text-white">{currentData.people.toLocaleString()}</span>
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
            })}
          </div>
        </TabsContent>
      </Tabs>

      <footer className="bg-white dark:bg-black">
        <div
          className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-black dark:bg-white transition-all group-hover:bg-neutral-800 dark:group-hover:bg-neutral-200"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-black dark:bg-white transition-all"
            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <div className="flex items-center justify-center gap-4 p-6">
          <Button
            variant="default"
            size="icon"
            className="cursor-pointer h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition- hover:scale-103"
            onClick={() => setProgress(Math.max(0, progress - 2))} // Retrocede en el tiempo
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="cursor-pointer h-10 w-10 rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          <Button
            variant="default"
            size="icon"
            className="cursor-pointer h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-all hover:scale-103"
            onClick={() => setProgress(Math.min(100, progress + 2))} // Avanza en el tiempo
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
