import { RadialBar, RadialBarChart, PolarGrid, PolarRadiusAxis } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

type GaugeProps = {
  percentage: number
  color: string
  value: number
  label: string
}

export default function Gauge({ percentage, color, value, label }: GaugeProps) {
  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
                    <ChartContainer
                      config={{
                        background: {
                          label: "Background",
                            color: "hsl(0 0% 90%)",
                          },
                        ratio: {
                          label: "Ratio",
                          color: color,
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
                            value: percentage,
                            fill: color
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
                        {value.toFixed(0)}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {label}
                      </div>
                    </div>
                  </div>
  )
}