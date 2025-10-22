import { travelsData } from '@/data/travelsData';

export function getCurrentTravelData(travel: typeof travelsData[0], progress: number) {
    const roundedProgress = Math.round(progress)
    return travel.timeline.find(t => t.progress === roundedProgress) || travel.timeline[0]
  }

export function getPreviousTravelData(travel: typeof travelsData[0], progress: number) {
  const roundedProgress = Math.round(progress)
  if (roundedProgress === 0) return null
  return travel.timeline.find(t => t.progress === roundedProgress - 1) || null
}