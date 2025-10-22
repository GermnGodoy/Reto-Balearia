"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { DollarSign, Users } from "lucide-react"
import { useTravelStats } from "@/hooks/useTravelStats"
import { useProgress } from "@/contexts/ProgressContext"
import { TrendChart } from "@/components/charts/TrendChart"
import Gauge from "@/components/ui/gauge"

export default function StatsTab() {
  const { progress } = useProgress()
  const {
    currentMeanData,
    gaugePercentage,
    gaugeColor,
    historicalData,
    trends
  } = useTravelStats(progress)
  return (
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
                  <Gauge
                    percentage={gaugePercentage}
                    color={gaugeColor}
                    value={currentMeanData.ratio}
                    label="$ per person"
                  />

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
                  <TrendChart
                    data={historicalData}
                    actualDataKey="profit"
                    predictedDataKey="predictedProfit"
                    errorDataKey="profitError"
                    actualColor={trends.profit.color}
                    label="Profit"
                  />
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
                  <TrendChart
                    data={historicalData}
                    actualDataKey="people"
                    predictedDataKey="predictedPeople"
                    errorDataKey="peopleError"
                    actualColor={trends.people.color}
                    label="People"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
  )
}