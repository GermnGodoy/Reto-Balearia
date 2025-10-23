"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "./card"

interface CollapsibleCardProps extends React.ComponentProps<"div"> {
  defaultCollapsed?: boolean
  collapsedTitle?: React.ReactNode
}

function CollapsibleCard({
  className,
  defaultCollapsed = true,
  collapsedTitle = "Click to expand",
  children,
  ...props
}: CollapsibleCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  return (
    <div
      className={cn(
        "relative border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-black shadow-sm overflow-hidden text-black dark:text-white",
        !isCollapsed && "py-6",
        className
      )}
      {...props}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all",
          isCollapsed
            ? "w-full hover:bg-neutral-100 dark:hover:bg-neutral-800/70 rounded-t-xl"
            : "absolute top-2 right-2 z-10 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 rounded-md px-3 py-2"
        )}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-black dark:text-white">
                {collapsedTitle}
              </div>
            </div>
            <ChevronDown
              className="h-4 w-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 flex-shrink-0"
            />
          </div>
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 rotate-180"
          />
        )}
      </button>

      <div
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        )}
      >
        <div className={cn(isCollapsed && "border-t border-neutral-200 dark:border-neutral-700")}>
          {children}
        </div>
      </div>
    </div>
  )
}

function CollapsibleCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardHeader className={className} {...props} />
  )
}

function CollapsibleCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardTitle
      className={cn("text-black dark:text-white", className)}
      {...props}
    />
  )
}

function CollapsibleCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardDescription
      className={cn("text-neutral-600 dark:text-neutral-400", className)}
      {...props}
    />
  )
}

function CollapsibleCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardContent className={className} {...props} />
  )
}

function CollapsibleCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardFooter className={className} {...props} />
  )
}

function CollapsibleCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CardAction className={className} {...props} />
  )
}

export {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
  CollapsibleCardFooter,
  CollapsibleCardAction,
}
