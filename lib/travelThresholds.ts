// Threshold configuration for travel metrics
// Adjust these values to change when arrows appear

export const THRESHOLDS = {
  // Demand (avg_volumen_grupo) thresholds
  demand: {
    veryLow: 30,    // Below this: two down arrows
    low: 50,       // Below this: one down arrow
    medium: 70,    // Below this: equal sign
    high: 100,      // Below this: one up arrow
    // Above high: two up arrows
  },

  // Price (avg_precio_medio_producto) thresholds
  price: {
    veryLow: 500,   // Below this: two down arrows
    low: 1000,       // Below this: one down arrow
    medium: 3000,   // Below this: equal sign
    high: 4000,     // Below this: one up arrow
    // Above high: two up arrows
  }
}

export type TrendLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high'

export function getTrendLevel(value: number, type: 'demand' | 'price'): TrendLevel {
  const thresholds = THRESHOLDS[type]

  if (value < thresholds.veryLow) return 'very-low'
  if (value < thresholds.low) return 'low'
  if (value < thresholds.medium) return 'medium'
  if (value < thresholds.high) return 'high'
  return 'very-high'
}
