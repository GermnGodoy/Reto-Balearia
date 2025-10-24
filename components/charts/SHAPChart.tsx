"use client"

import dynamic from 'next/dynamic'
import { useMemo, useEffect, useState } from 'react'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export type SHAPData = {
  nodes: { name: string }[]
  links: { source: number; target: number; value: number }[]
}

type SHAPChartProps = {
  data: SHAPData
  baseValue?: number
  className?: string
}

export function SHAPChart({ data, baseValue = 0, className = "" }: SHAPChartProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    checkTheme()

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const chartData = useMemo(() => {
    // Find the prediction node (usually the last one)
    const predictionIndex = data.nodes.length - 1

    // Extract feature contributions (links that point to the prediction node)
    const contributions = data.links
      .filter(link => link.target === predictionIndex)
      .map((link, index) => ({
        feature: data.nodes[link.source].name,
        // Alternate between positive and negative for SHAP-like visualization
        value: index % 2 === 0 ? link.value : -link.value
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)) // Sort by absolute value descending

    // Calculate cumulative positions (waterfall effect)
    let cumulative = baseValue
    const cumulativeStarts: number[] = []
    const cumulativeEnds: number[] = []

    contributions.forEach(contrib => {
      cumulativeStarts.push(cumulative)
      cumulative += contrib.value
      cumulativeEnds.push(cumulative)
    })

    return {
      features: contributions.map(c => c.feature),
      values: contributions.map(c => c.value),
      cumulativeStarts,
      cumulativeEnds
    }
  }, [data, baseValue])

  const textColor = isDark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'
  const gridColor = isDark ? 'rgb(115, 115, 115)' : 'rgb(229, 229, 229)'
  const increasingColor = 'rgb(255, 100, 120)' // Red for positive contributions
  const decreasingColor = 'rgb(100, 150, 255)' // Blue for negative contributions
  const connectorColor = isDark ? 'rgb(163, 163, 163)' : 'rgb(163, 163, 163)'

  // Create shapes for bars and triangles
  const shapes: any[] = []
  const annotations: any[] = []

  chartData.values.forEach((value, index) => {
    const yPos = chartData.features.length - index - 1 // Reverse order for top-to-bottom
    const start = chartData.cumulativeStarts[index]
    const end = chartData.cumulativeEnds[index]
    const color = value >= 0 ? increasingColor : decreasingColor

    const barHeight = 0.6
    const triangleWidth = Math.abs(value) * 0.08

    // Add connector line from previous bar
    if (index > 0) {
      const prevEnd = chartData.cumulativeEnds[index - 1]
      const prevYPos = chartData.features.length - index
      shapes.push({
        type: 'line',
        x0: prevEnd,
        x1: start,
        y0: prevYPos - barHeight / 2,
        y1: yPos + barHeight / 2,
        line: { color: connectorColor, width: 1 },
        xref: 'x',
        yref: 'y'
      })
    }

    // Create bar rectangle (excluding triangle area)
    const barEnd = value >= 0 ? end - triangleWidth : end + triangleWidth
    shapes.push({
      type: 'rect',
      x0: Math.min(start, barEnd),
      x1: Math.max(start, barEnd),
      y0: yPos - barHeight / 2,
      y1: yPos + barHeight / 2,
      fillcolor: color,
      line: { width: 0 },
      xref: 'x',
      yref: 'y'
    })

    // Create triangle at the end
    const triangleStart = value >= 0 ? end - triangleWidth : end + triangleWidth
    shapes.push({
      type: 'path',
      path: value >= 0
        ? `M ${triangleStart},${yPos - barHeight / 2} L ${end},${yPos} L ${triangleStart},${yPos + barHeight / 2} Z`
        : `M ${triangleStart},${yPos - barHeight / 2} L ${end},${yPos} L ${triangleStart},${yPos + barHeight / 2} Z`,
      fillcolor: color,
      line: { width: 0 },
      xref: 'x',
      yref: 'y'
    })

    // Add feature name annotation (inside the bar in white)
    annotations.push({
      x: (start + end) / 2,
      y: yPos,
      text: chartData.features[index],
      showarrow: false,
      font: { size: 11, color: 'white', weight: 600 },
      xref: 'x',
      yref: 'y',
      xanchor: 'center',
      yanchor: 'middle'
    })

    // Add value annotation
    annotations.push({
      x: end,
      y: yPos,
      text: value >= 0 ? `+${value.toFixed(2)}` : `${value.toFixed(2)}`,
      showarrow: false,
      font: { size: 10, color: color },
      xanchor: value >= 0 ? 'left' : 'right',
      xshift: value >= 0 ? 8 : -8,
      xref: 'x',
      yref: 'y'
    })
  })

  // Add base value annotation
  annotations.push({
    x: baseValue,
    y: chartData.features.length,
    text: `E[f(x)] = ${baseValue.toFixed(2)}`,
    showarrow: false,
    font: { size: 11, color: textColor },
    xanchor: 'center',
    yanchor: 'bottom',
    xref: 'x',
    yref: 'y'
  })

  // Add final prediction annotation
  const finalValue = chartData.cumulativeEnds[chartData.cumulativeEnds.length - 1]
  annotations.push({
    x: finalValue,
    y: -0.5,
    text: `f(x) = ${finalValue.toFixed(2)}`,
    showarrow: false,
    font: { size: 11, color: textColor },
    xanchor: 'center',
    yanchor: 'top',
    xref: 'x',
    yref: 'y'
  })

  return (
    <div className={className}>
      <Plot
        key={isDark ? 'dark' : 'light'}
        data={[
          // Invisible hover points at triangle endpoints
          {
            type: 'scatter',
            mode: 'markers',
            x: chartData.cumulativeEnds,
            y: chartData.cumulativeEnds.map((_, index) => chartData.features.length - index - 1),
            marker: {
              size: 15,
              color: 'rgba(0,0,0,0)',
              line: { width: 0 }
            },
            text: chartData.cumulativeEnds.map((val, idx) =>
              `<b>${chartData.features[idx]}</b><br>Prediction: ${val.toFixed(2)}<br>Contribution: ${chartData.values[idx] >= 0 ? '+' : ''}${chartData.values[idx].toFixed(2)}`
            ),
            hovertemplate: '%{text}<extra></extra>',
            showlegend: false,
            hoverlabel: {
              bgcolor: isDark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
              bordercolor: isDark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
              font: { color: textColor, size: 12 }
            }
          }
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: {
            family: 'system-ui, -apple-system, sans-serif',
            size: 12,
            color: textColor
          },
          xaxis: {
            title: {
              text: 'Contribution',
              font: { size: 13, color: textColor }
            },
            tickfont: { size: 11, color: textColor },
            gridcolor: gridColor,
            showgrid: true,
            zeroline: true,
            zerolinecolor: connectorColor,
            zerolinewidth: 2
          },
          yaxis: {
            title: {
              text: '',
              font: { size: 13, color: textColor }
            },
            tickfont: { size: 11, color: textColor },
            gridcolor: gridColor,
            showgrid: false,
            zeroline: false,
            showticklabels: false,
            range: [-1, chartData.features.length + 0.5]
          },
          margin: { l: 20, r: 100, t: 30, b: 60 },
          showlegend: false,
          hovermode: 'closest',
          shapes: shapes,
          annotations: annotations
        }}
        config={{
          displayModeBar: false,
          responsive: true
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
