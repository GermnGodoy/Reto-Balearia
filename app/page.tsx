"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Play, Pause, SkipBack, SkipForward, DollarSign, Users, ArrowUp, ArrowDown } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Line, LineChart, ComposedChart, ErrorBar } from "recharts"
import travelsData from "@/data/travels.json"
import dynamic from "next/dynamic";

const MapDraw = dynamic(() => import("@/components/ui/MapDraw"), { ssr: false });

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

  // Calculate mean values for current progress
  const currentMeanData = useMemo(() => {
    const roundedProgress = Math.round(progress)
    let totalProfit = 0
    let totalPeople = 0

    travelsData.forEach(travel => {
      const data = travel.timeline.find(t => t.progress === roundedProgress)
      if (data) {
        totalProfit += data.profit
        totalPeople += data.people
      }
    })

    const meanProfit = totalProfit / travelsData.length
    const meanPeople = totalPeople / travelsData.length
    const ratio = meanPeople > 0 ? (meanProfit / meanPeople) : 0

    return { meanProfit, meanPeople, ratio }
  }, [progress])

  // Calculate min and max ratio across all timeline data
  const { minRatio, maxRatio } = useMemo(() => {
    let min = Infinity
    let max = -Infinity

    for (let i = 0; i <= 100; i++) {
      let totalProfit = 0
      let totalPeople = 0

      travelsData.forEach(travel => {
        const data = travel.timeline.find(t => t.progress === i)
        if (data) {
          totalProfit += data.profit
          totalPeople += data.people
        }
      })

      const meanProfit = totalProfit / travelsData.length
      const meanPeople = totalPeople / travelsData.length
      const ratio = meanPeople > 0 ? (meanProfit / meanPeople) : 0

      if (ratio > 0) {
        min = Math.min(min, ratio)
        max = Math.max(max, ratio)
      }
    }

    return { minRatio: min, maxRatio: max }
  }, [])

  // Map ratio to gauge percentage (15% to 90%)
  const gaugePercentage = useMemo(() => {
    if (currentMeanData.ratio === 0) return 15

    // Handle edge case where min === max
    if (maxRatio === minRatio) {
      return 52.5 // Middle value if all ratios are the same
    }

    const normalized = (currentMeanData.ratio - minRatio) / (maxRatio - minRatio)
    const percentage = 15 + (normalized * 75) // Maps to 15-90%

    // Debug logging
    console.log('Gauge Debug:', {
      currentRatio: currentMeanData.ratio,
      minRatio,
      maxRatio,
      normalized,
      percentage
    })

    return percentage
  }, [currentMeanData.ratio, minRatio, maxRatio])

  // Calculate gauge color based on percentage value
  const gaugeColor = useMemo(() => {
    if (gaugePercentage >= 60) {
      return "hsl(142.1 76.2% 36.3%)" // Green - high efficiency
    } else if (gaugePercentage >= 25) {
      return "hsl(45 93% 47%)" // Yellow - medium efficiency
    } else {
      return "hsl(0 84% 60%)" // Red - low efficiency
    }
  }, [gaugePercentage])

  // Get historical data for last 10 progress points
  const historicalData = useMemo(() => {
    const roundedProgress = Math.round(progress)
    const startProgress = Math.max(0, roundedProgress - 9)
    const data = []

    for (let i = startProgress; i <= roundedProgress; i++) {
      let totalProfit = 0
      let totalPeople = 0
      let totalPredictedProfit = 0
      let totalPredictedPeople = 0
      let totalProfitError = 0
      let totalPeopleError = 0

      travelsData.forEach(travel => {
        const timelineData = travel.timeline.find(t => t.progress === i)
        if (timelineData) {
          totalProfit += timelineData.profit
          totalPeople += timelineData.people
          totalPredictedProfit += timelineData.predictedProfit
          totalPredictedPeople += timelineData.predictedPeople
          totalProfitError += Math.abs(timelineData.profitError)
          totalPeopleError += Math.abs(timelineData.peopleError)
        }
      })

      data.push({
        progress: i,
        profit: totalProfit,
        people: totalPeople,
        predictedProfit: totalPredictedProfit,
        predictedPeople: totalPredictedPeople,
        profitError: totalProfitError > 0 ? totalProfitError : 0,
        peopleError: totalPeopleError > 0 ? totalPeopleError : 0
      })
    }

    return data
  }, [progress])

  // Calculate trend color based on percentage change
  const getTrendColor = (percentChange: number) => {
    if (percentChange >= 0) {
      return "hsl(142.1 76.2% 36.3%)" // Green
    } else if (percentChange > -15) {
      return "hsl(45 93% 47%)" // Yellow
    } else {
      return "hsl(0 84% 60%)" // Red
    }
  }

  // Calculate trends for each metric
  const trends = useMemo(() => {
    if (historicalData.length < 2) {
      return {
        profit: { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" },
        people: { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" },
        ratio: { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" }
      }
    }

    const firstData = historicalData[0]
    const lastData = historicalData[historicalData.length - 1]

    const profitChange = firstData.profit > 0
      ? ((lastData.profit - firstData.profit) / firstData.profit) * 100
      : 0

    const peopleChange = firstData.people > 0
      ? ((lastData.people - firstData.people) / firstData.people) * 100
      : 0

    // Calculate ratio change
    const firstRatio = firstData.people > 0 ? firstData.profit / firstData.people : 0
    const lastRatio = lastData.people > 0 ? lastData.profit / lastData.people : 0
    const ratioChange = firstRatio > 0
      ? ((lastRatio - firstRatio) / firstRatio) * 100
      : 0

    return {
      profit: { percentChange: profitChange, color: getTrendColor(profitChange) },
      people: { percentChange: peopleChange, color: getTrendColor(peopleChange) },
      ratio: { percentChange: ratioChange, color: getTrendColor(ratioChange) }
    }
  }, [historicalData])

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
        >
          <div className="w-full h-full min-h-[400px]">
            <MapDraw />
          </div>
        </TabsContent>
        <TabsContent
          value="page2"
          className="flex-1 bg-white dark:bg-black m-0 overflow-auto p-6 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300"
        >
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Gauge Chart */}
            <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-black dark:text-white">Efficiency Ratio</CardTitle>
                <CardDescription className="text-neutral-600 dark:text-neutral-400">
                  Average profit per person across all active travels
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                <div className="flex flex-col items-center justify-center py-0">
                  <div className="relative w-[280px] h-[280px] mx-auto">
                    <ChartContainer
                      config={{
                        background: {
                          label: "Background",
                          color: "hsl(0 0% 90%)",
                        },
                        ratio: {
                          label: "Ratio",
                          color: gaugeColor,
                        },
                      }}
                      className="w-full h-full"
                    >
                      <RadialBarChart
                        width={280}
                        height={280}
                        data={[
                          {
                            name: "background",
                            value: 100,
                            fill: "hsl(0 0% 90%)"
                          },
                          {
                            name: "ratio",
                            value: gaugePercentage,
                            fill: gaugeColor
                          }
                        ]}
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={90}
                        outerRadius={120}
                      >
                        <PolarGrid
                          gridType="circle"
                          radialLines={false}
                          stroke="none"
                          className="first:fill-transparent last:fill-transparent"
                        />
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
                      </RadialBarChart>
                    </ChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-5xl font-bold text-black dark:text-white">
                        {currentMeanData.ratio.toFixed(0)}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        $ per person
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="flex flex-col items-center justify-center p-0 space-y-0 rounded-lg bg-neutral-50 dark:bg-black/50 ">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Avg Profit</span>
                      </div>
                      <div className="text-xl font-bold text-black dark:text-white">
                        ${(currentMeanData.meanProfit / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-0 p-0 rounded-lg bg-neutral-50 dark:bg-black ">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Avg People</span>
                      </div>
                      <div className="text-2xl font-bold text-black dark:text-white">
                        {Math.round(currentMeanData.meanPeople)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Area Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit Chart */}
              <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black">
                <CardHeader>
                  <CardTitle className="text-black dark:text-white">Total Profit Trend</CardTitle>
                  <CardDescription className="text-neutral-600 dark:text-neutral-400">
                    Last 10 progress points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      profit: {
                        label: "Actual Profit",
                        color: trends.profit.color,
                      },
                      predictedProfit: {
                        label: "Predicted Profit",
                        color: "hsl(142.1 76.2% 36.3%)",
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <ComposedChart data={historicalData}>
                      <defs>
                        <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={trends.profit.color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={trends.profit.color} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="progress"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="fill-neutral-600 dark:fill-neutral-400"
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke={trends.profit.color}
                        fill="url(#fillProfit)"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedProfit"
                        stroke="white"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        strokeOpacity={0.9}
                        dot={{ fill: "white", r: 5, strokeWidth: 0 }}
                      >
                        <ErrorBar
                          dataKey="profitError"
                          width={8}
                          strokeWidth={1.5}
                          stroke="white"
                          opacity={0.3}
                        />
                      </Line>
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* People Chart */}
              <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black">
                <CardHeader>
                  <CardTitle className="text-black dark:text-white">Total People Trend</CardTitle>
                  <CardDescription className="text-neutral-600 dark:text-neutral-400">
                    Last 10 progress points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      people: {
                        label: "Actual People",
                        color: trends.people.color,
                      },
                      predictedPeople: {
                        label: "Predicted People",
                        color: "hsl(221.2 83.2% 53.3%)",
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <ComposedChart data={historicalData}>
                      <defs>
                        <linearGradient id="fillPeople" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={trends.people.color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={trends.people.color} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="progress"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="fill-neutral-600 dark:fill-neutral-400"
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        type="monotone"
                        dataKey="people"
                        stroke={trends.people.color}
                        fill="url(#fillPeople)"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedPeople"
                        stroke="white"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        strokeOpacity={0.9}
                        dot={{ fill: "white", r: 5, strokeWidth: 0 }}
                      >
                        <ErrorBar
                          dataKey="peopleError"
                          width={8}
                          strokeWidth={1.5}
                          stroke="white"
                          opacity={0.3}
                        />
                      </Line>
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
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
            className="h-full bg-black dark:bg-white transition-all duration-300 group-hover:bg-neutral-800 dark:group-hover:bg-neutral-200"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-2 -translate-y-1/2 w-2.5 h-3 rounded-full bg-black dark:bg-white transition-all duration-300"
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
