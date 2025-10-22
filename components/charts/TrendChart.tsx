"use client"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, ComposedChart, Line, XAxis, ErrorBar } from "recharts"

type TrendChartProps = {
  data: any[]
  actualDataKey: string
  predictedDataKey: string
  errorDataKey: string
  actualColor: string
  predictedColor?: string
  label: string
  xAxisKey?: string
  className?: string
}

export function TrendChart({
  data,
  actualDataKey,
  predictedDataKey,
  errorDataKey,
  actualColor,
  predictedColor = "white",
  label,
  xAxisKey = "progress",
  className = "h-[250px] w-full"
}: TrendChartProps) {
  return (
    <ChartContainer
      config={{
        [actualDataKey]: {
          label: `Actual ${label}`,
          color: actualColor,
        },
        [predictedDataKey]: {
          label: `Predicted ${label}`,
          color: predictedColor,
        },
      }}
      className={className}
    >
      <ComposedChart data={data}>
        <defs>
          <linearGradient id={`fill${actualDataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={actualColor} stopOpacity={0.8} />
            <stop offset="95%" stopColor={actualColor} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey={xAxisKey}
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
          dataKey={actualDataKey}
          stroke={actualColor}
          fill={`url(#fill${actualDataKey})`}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey={predictedDataKey}
          stroke={predictedColor}
          strokeWidth={3}
          strokeDasharray="5 5"
          strokeOpacity={0.9}
          dot={{ fill: predictedColor, r: 5, strokeWidth: 0 }}
        >
          <ErrorBar
            dataKey={errorDataKey}
            width={8}
            strokeWidth={1.5}
            stroke={predictedColor}
            opacity={0.3}
          />
        </Line>
      </ComposedChart>
    </ChartContainer>
  )
}
