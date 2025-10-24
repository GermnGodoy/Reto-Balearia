import modelWeightsData from '@/data/model-weights.json';

export function getCurrentTravelData(travel: typeof travelsData[0], progress: number) {
    const roundedProgress = Math.round(progress)
    return travel.timeline.find(t => t.progress === roundedProgress) || travel.timeline[0]
  }

export function getPreviousTravelData(travel: typeof travelsData[0], progress: number) {
  const roundedProgress = Math.round(progress)
  if (roundedProgress === 0) return null
  return travel.timeline.find(t => t.progress === roundedProgress - 1) || null
}

export function getPast15DaysTravels(travelsData, progress: number) {
  const roundedProgress = Math.round(progress)
  const startProgress = Math.max(0, roundedProgress - 15)

  return travelsData.map(travel => ({
    name: travel.name,
    description: travel.description,
    data: travel.timeline.filter(t => t.progress >= startProgress && t.progress <= roundedProgress)
  }))
}

export function getPast15DaysWeights(progress: number) {
  const roundedProgress = Math.round(progress)
  const startProgress = Math.max(0, roundedProgress - 15)

  return modelWeightsData.filter(w => w.progress >= startProgress && w.progress <= roundedProgress)
}