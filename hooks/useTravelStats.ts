// hooks/useTravelStats.ts
import { useMemo } from 'react'
import { useTravels } from '@/contexts/travelsContext'
import { gaugeColor as getGaugeColor, getTrendColor } from '@/functions/colors'

// 👇 Añade estos tipos si no los tienes exportados del contexto
type TimelineEntry = {
  progress: number
  isActive: boolean
  profit: number
  people: number
  predictedProfit: number
  profitError: number
  predictedPeople: number
  peopleError: number
}
type Travel = {
  name: string
  description: string
  timeline: TimelineEntry[]
}

// 👇 ÚNICO CAMBIO de API: travelsOverride opcional
export function useTravelStats(progress: number, travelsOverride?: Travel[]) {
  const { travels: travelsDataFromContext } = useTravels()
  const travelsData = travelsOverride ?? travelsDataFromContext

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
  }, [progress, travelsData])

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
  }, [travelsData])

  const gaugePercentage = useMemo(() => {
    if (currentMeanData.ratio === 0) return 15
    if (maxRatio === minRatio) return 52.5
    const normalized = (currentMeanData.ratio - minRatio) / (maxRatio - minRatio)
    return 15 + (normalized * 75)
  }, [currentMeanData.ratio, minRatio, maxRatio])

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
        const t = travel.timeline.find(x => x.progress === i)
        if (t) {
          totalProfit += t.profit
          totalPeople += t.people
          totalPredictedProfit += t.predictedProfit
          totalPredictedPeople += t.predictedPeople
          totalProfitError += Math.abs(t.profitError)
          totalPeopleError += Math.abs(t.peopleError)
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
  }, [progress, travelsData])

  const gaugeColor = useMemo(() => getGaugeColor(gaugePercentage), [gaugePercentage])

  const trends = useMemo(() => {
    if (historicalData.length < 2) {
      return {
        profit: { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" },
        people: { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" },
        ratio:  { percentChange: 0, color: "hsl(142.1 76.2% 36.3%)" }
      }
    }

    const first = historicalData[0]
    const last = historicalData[historicalData.length - 1]

    const profitChange = first.profit > 0 ? ((last.profit - first.profit) / first.profit) * 100 : 0
    const peopleChange = first.people > 0 ? ((last.people - first.people) / first.people) * 100 : 0

    const firstRatio = first.people > 0 ? first.profit / first.people : 0
    const lastRatio  = last.people  > 0 ? last.profit  / last.people  : 0
    const ratioChange = firstRatio > 0 ? ((lastRatio - firstRatio) / firstRatio) * 100 : 0

    return {
      profit: { percentChange: profitChange, color: getTrendColor(profitChange) },
      people: { percentChange: peopleChange, color: getTrendColor(peopleChange) },
      ratio:  { percentChange: ratioChange,  color: getTrendColor(ratioChange)  }
    }
  }, [historicalData])

  return {
    travelsData,
    currentMeanData,
    minRatio,
    maxRatio,
    gaugePercentage,
    gaugeColor,
    historicalData,
    trends
  }
}
