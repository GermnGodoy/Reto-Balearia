"use client"

import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { useProgress } from "@/contexts/ProgressContext"

export default function Footer() {
  const { progress, setProgress, isPlaying, setIsPlaying } = useProgress()

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setProgress(Math.max(0, Math.min(100, percentage)))
  }

  // Navigate by day: each day is 10% progress (day 0-9 maps to 0%, 10%, 20%, ..., 90%)
  const handlePrevDay = () => {
    const currentDay = Math.floor(progress / 10)
    const prevDay = Math.max(0, currentDay - 1)
    setProgress(prevDay * 10)
  }

  const handleNextDay = () => {
    const currentDay = Math.floor(progress / 10)
    const nextDay = Math.min(9, currentDay + 1)
    setProgress(nextDay * 10)
  }

  return (
    <footer className="bg-white dark:bg-black">
      <div
        className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-red-300 dark:bg-red-400 transition-all duration-300 group-hover:bg-red-400 dark:group-hover:bg-red-500"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-2 -translate-y-1/2 w-2.5 h-3 rounded-full bg-red-400 dark:bg-red-500 transition-all duration-300"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex items-center justify-center gap-4 p-6">
        <Button
          variant="default"
          size="icon"
          className="cursor-pointer h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition- hover:scale-103"
          onClick={handlePrevDay}
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          className="cursor-pointer h-10 w-10 rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>
        <Button
          variant="default"
          size="icon"
          className="cursor-pointer h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-all hover:scale-103"
          onClick={handleNextDay}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </footer>
  )
}
