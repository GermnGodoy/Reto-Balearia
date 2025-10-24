import { TrendingDown, TrendingUp, DollarSign, Users, Cloud, Calendar } from "lucide-react"

export default function InsightCards() {
  // Mockup insights data
  const insights = [
    {
      id: "price-strategy",
      title: "Lower Prices to Increase Demand",
      description: "Reducing prices could help boost passenger numbers in the current market conditions.",
      icon: DollarSign,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    },
    {
      id: "profit-up",
      title: "Profit Increasing",
      description: "Average profit has shown positive growth across active routes in recent days.",
      icon: TrendingUp,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    },
    {
      id: "demand-high",
      title: "High Demand Influence",
      description: "Demand is currently weighted highly in predictions. Market conditions are favorable.",
      icon: Users,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    },
    {
      id: "weather-impact",
      title: "Weather Impact Moderate",
      description: "Weather conditions are affecting predictions. Monitor forecasts closely.",
      icon: Cloud,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    },
    {
      id: "seasonal",
      title: "Seasonal Patterns Strong",
      description: "Seasonality is a major factor. Historical patterns are reliable predictors.",
      icon: Calendar,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    },
    {
      id: "profit-down",
      title: "Revenue Opportunity",
      description: "Consider adjusting pricing strategy to maximize revenue potential.",
      icon: TrendingDown,
      color: "text-black dark:text-white",
      bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
      borderColor: "border-black dark:border-white"
    }
  ]

  return (
    <div className="flex gap-6 overflow-x-auto pb-2 mt-9">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div
              key={insight.id}
              className={`border rounded-lg p-4 ${insight.bgColor} ${insight.borderColor} transition-all hover:shadow-md flex-shrink-0 w-64`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                  <Icon className={`h-5 w-5 ${insight.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm mb-1 ${insight.color}`}>
                    {insight.title}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
  )
}