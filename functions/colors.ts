const COLORS = {
    GREEN: "hsl(142.1 76.2% 36.3%)",
    YELLOW: "hsl(45 93% 47%)",
    RED: "hsl(0 84% 60%)"
  }



export function gaugeColor(gaugePercentage: number) {
    if (gaugePercentage >= 60) {
      return COLORS.GREEN
    } else if (gaugePercentage >= 25) {
      return COLORS.YELLOW
    } else {
      return COLORS.RED
    }
  }

export function getTrendColor(percentChange: number) {
  if (percentChange >= 0) {
    return COLORS.GREEN
  } else if (percentChange > -15) {
    return COLORS.YELLOW
  } else {
    return COLORS.RED
  }
}
