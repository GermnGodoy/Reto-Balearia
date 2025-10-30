"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MapDraw from "@/components/ui/MapDraw"

import { getCurrentTravelData, getPreviousTravelData } from "@/functions/db"
import { useProgress } from "@/contexts/ProgressContext"
import { useTravels } from "@/contexts/travelsContext"
import StatsTab from "@/components/pages/statsTab"
import Footer from "@/components/Footer"
import TravelsTab from "@/components/pages/travelsTab"
import ChatbotLauncher from "@/components/chat/ChatbotLauncher"

export default function Home() {
  // Get progress state from context
  const { progress, setProgress, isPlaying, setIsPlaying } = useProgress()
  const { travels: travelsData } = useTravels()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tabValue, setTabValue] = useState(() => searchParams.get("tab") ?? "page1")

  useEffect(() => {
    const nextTab = searchParams.get("tab") ?? "page1"
    setTabValue((prev) => (prev === nextTab ? prev : nextTab))
  }, [searchParams])

  const handleTabChange = (value: string) => {
    if (value === tabValue) return

    setTabValue(value)

    const params = new URLSearchParams(searchParams.toString())
    if (value === "page1") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }

    const queryString = params.toString()
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false })
  }

  // if isPlaying increment progress
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
  }, [isPlaying, setProgress, setIsPlaying])

  return (
    <div className="h-screen flex flex-col">
      <Tabs value={tabValue} onValueChange={handleTabChange} className="flex-1 flex flex-col gap-0">
        {/* Top Bar of tabs (carefull with the value)*/}
        <div className="bg-neutral-100 dark:bg-neutral-950">
          <TabsList className="bg-neutral-100 dark:bg-neutral-950 h-auto p-0 gap-1 flex w-full mt-1">
            <TabsTrigger
              value="page1"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-[#e0efef] dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 text-sm border-none transition-all"
            >
              Mapa
            </TabsTrigger>
            <TabsTrigger
              value="page2"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-[#e0efef] dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 text-sm border-none transition-all"
            >
              Estadísticas
            </TabsTrigger>
            <TabsTrigger
              value="page3"
              className="cursor-pointer rounded-t-sm rounded-b-none px-6 py-1 w-full data-[state=active]:bg-[#e0efef] dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=inactive]:bg-neutral-300 dark:data-[state=inactive]:bg-neutral-800 data-[state=inactive]:text-neutral-700 dark:data-[state=inactive]:text-neutral-400 border-none text-sm transition-all"
            >
              Viajes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="page1"
          className="flex-1 bg-[#e0efef] dark:bg-black m-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        >
          <div className="w-full h-full min-h-[400px]">
            <MapDraw />
          </div>
        </TabsContent>
        <TabsContent
          value="page2"
          className="flex-1 bg-[#e0efef] dark:bg-black m-0 overflow-auto p-6 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        >
          <StatsTab />
        </TabsContent>
        <TabsContent
          value="page3"
          className="flex-1 bg-[#e0efef] dark:bg-black m-0 overflow-auto p-6 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        >
          <TravelsTab />
        </TabsContent>
      </Tabs>

      <Footer />

            {/*Floating button + right-side chat window */}
      <ChatbotLauncher />
    </div>
  )
}
