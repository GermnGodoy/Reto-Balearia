import { Area, ComposedChart, Line, XAxis, ErrorBar } from "recharts"

import { useTravelStats } from "@/hooks/useTravelStats"
import { useTravels } from "@/contexts/travelsContext"
import { ChartContainer } from "@/components/ui/chart"
import { ChartTooltip } from "@/components/ui/chart/ChartTooltip"
import { ChartTooltipContent } from "@/components/ui/chart/ChartTooltipContent"
import { useProgress } from "@/contexts/ProgressContext"
import { getCurrentTravelData } from "@/functions/db"

export default function Chart(historicalData: any[], trends: any, color: string) {
  const { progress } = useProgress()
  const { travels: travelsData } = useTravels()

  return (
    <ChartContainer
      config={{
        profit: {
          label: "Actual Profit",
          color: trends.profit.color,
                      },
                      predictedProfit: {
                        label: label,
                        color: color,
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <ComposedChart data={historicalData}>
                      <defs>
                        <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.1} />
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
                        stroke={color}
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
                );
}