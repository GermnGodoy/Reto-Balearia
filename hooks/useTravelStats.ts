import { useMemo } from 'react'
import { useTravels } from '@/contexts/travelsContext'
import { gaugeColor as getGaugeColor, getTrendColor } from '@/functions/colors'

export function useTravelStats(progress: number) {
  const { travels: travelsData } = useTravels()

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
  }, [progress, travelsData])

  // Calculate gauge color
  const gaugeColor = useMemo(() => getGaugeColor(gaugePercentage), [gaugePercentage])

  // Calculate trends
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