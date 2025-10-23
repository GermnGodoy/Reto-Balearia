"use client"

import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Sankey, Tooltip, Rectangle, Layer } from "recharts"

export type SankeyNode = {
  name: string
}

export type SankeyLink = {
  source: number
  target: number
  value: number
}

export type SankeyData = {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

type SankeyChartProps = {
  data: SankeyData
  className?: string
  height?: number
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function SankeyChart({
  data,
  className = "h-[400px] w-full",
  height = 400,
}: SankeyChartProps) {
  const config: ChartConfig = data.nodes.reduce((acc, node, index) => {
    acc[node.name] = {
      label: node.name,
      color: COLORS[index % COLORS.length],
    }
    return acc
  }, {} as ChartConfig)

  const sankeyData = {
    nodes: data.nodes.map((node, index) => ({
      name: node.name,
    })),
    links: data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    })),
  }

  const CustomNode = ({ x, y, width, height, index, payload }: any) => {
    const isOut = x + width + 6 > 600
    const color = COLORS[index % COLORS.length]

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity="0.9"
        />
        <text
          textAnchor={isOut ? "end" : "start"}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2}
          fontSize="13"
          fontWeight="600"
          className="fill-black dark:fill-white"
        >
          {payload.name}
        </text>
        <text
          textAnchor={isOut ? "end" : "start"}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2 + 16}
          fontSize="11"
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {payload.value}
        </text>
      </Layer>
    )
  }

  const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: any) => {
    const link = sankeyData.links[index]
    const color = COLORS[link.source % COLORS.length]

    return (
      <path
        key={`link-${index}`}
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={color}
        strokeWidth={linkWidth}
        strokeOpacity="0.3"
        className="hover:stroke-opacity-50 transition-all"
      />
    )
  }

  return (
    <ChartContainer config={config} className={className}>
      <Sankey
        data={sankeyData}
        width={800}
        height={height}
        node={<CustomNode />}
        link={<CustomLink />}
        nodePadding={20}
        margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
      >
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.[0]) return null
            const data = payload[0].payload
            return (
              <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
                <div className="text-sm font-semibold text-black dark:text-white">
                  {data.name}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {data.value}
                </div>
              </div>
            )
          }}
        />
      </Sankey>
    </ChartContainer>
  )
}
