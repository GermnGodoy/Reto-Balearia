"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { DollarSign, Users } from "lucide-react"
import { useTravelStats } from "@/hooks/useTravelStats"
import { useProgress } from "@/contexts/ProgressContext"
import { TrendChart } from "@/components/charts/TrendChart"
import Gauge from "@/components/ui/gauge"
import { SHAPChart } from "@/components/charts/SHAPChart"
import modelWeightsData from "@/data/model-weights.json"

import InsightCards from "../ui/insightCards"

import { CollapsibleCard, CollapsibleCardContent, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription } from "../ui/collapsible-card"
import Explanations from "../Explanations"


export default function StatsTab() {
  const { progress } = useProgress()
  const {
    currentMeanData,
    gaugePercentage,
    gaugeColor,
    historicalData,
    trends
  } = useTravelStats(progress)

  // Find the model weights for the current progress
  const currentModelWeights = modelWeightsData.find(item => item.progress === Math.floor(progress)) || modelWeightsData[0]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
<Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black overflow-hidden">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
    {/* Mean Price panel */}
    <div className="flex flex-col items-center justify-center px-6 py-4">
      <h3 className="text-sm font-medium text-black dark:text-white">Mean Price</h3>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Average price per person across all active travels
      </p>
      <div className="mt-2">
        <Gauge
          percentage={gaugePercentage}          // replace with price % if you have it
          color={gaugeColor}
          value={currentMeanData.ratio}         // $ per person
          label="$ per person"
        />
      </div>
    </div>

    {/* Demand panel */}
    <div className="flex flex-col items-center justify-center px-6 py-4">
      <h3 className="text-sm font-medium text-black dark:text-white">Demand</h3>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Average people across all active travels
      </p>
      <div className="mt-2">
        <Gauge
          percentage={gaugePercentage}          // replace with demand % if you have it
          color={gaugeColor}
          value={Math.round(currentMeanData.meanPeople)}
          label="people"
        />
      </div>
    </div>
  </div>

  {/* Single centered extra info */}
  <div className="flex justify-center pb-4">
    <div className="mt-2 grid grid-cols-2 gap-4 w-full max-w-xs">
      <div className="flex flex-col items-center justify-center p-0 space-y-0 rounded-lg bg-neutral-50 dark:bg-black/50">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Avg Profit</span>
        </div>
        <div className="text-xl font-bold text-black dark:text-white">
          ${(currentMeanData.meanProfit / 1000).toFixed(1)}k
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-0 space-y-0 rounded-lg bg-neutral-50 dark:bg-black/50">
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
</Card>
            {/* Model Feature Weights */}
            <CollapsibleCard collapsedTitle="Explicaciones de Baleito">
              <CollapsibleCardHeader>
                <CollapsibleCardTitle>Explicaciones de Baleito</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  y explicabilidad del modelo para las decisiones tomadas en {Math.floor(progress)}.
                </CollapsibleCardDescription>
              </CollapsibleCardHeader>
              <CollapsibleCardContent>
                <Explanations />
                <SHAPChart
                  key={`shap-${Math.floor(progress)}`}
                  data={{
                    nodes: currentModelWeights.nodes,
                    links: currentModelWeights.links
                  }}
                  className="h-[400px] w-full"
                />
                <InsightCards />
              </CollapsibleCardContent>
            </CollapsibleCard>

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
