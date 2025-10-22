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

  return (
    <footer className="bg-white dark:bg-black">
      <div
        className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-black dark:bg-white transition-all duration-300 group-hover:bg-neutral-800 dark:group-hover:bg-neutral-200"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-2 -translate-y-1/2 w-2.5 h-3 rounded-full bg-black dark:bg-white transition-all duration-300"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex items-center justify-center gap-4 p-6">
        <Button
          variant="default"
          size="icon"
          className="cursor-pointer h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition- hover:scale-103"
          onClick={() => setProgress(Math.max(0, progress - 2))}
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
          onClick={() => setProgress(Math.min(100, progress + 2))}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </footer>
  )
}
