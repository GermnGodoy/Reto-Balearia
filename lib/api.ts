export type TravelData = {
  trayecto: string
  avg_demand?: number
  price?: number
  [key: string]: any
}

export async function fetchActiveTravels(fechaReserva: string): Promise<TravelData[]> {
  try {
    console.log('Fetching travels for date:', fechaReserva)
    const response = await fetch(
      'https://get-active-travels-298899681831.europe-west1.run.app',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha_reserva: fechaReserva,
        }),
      }
    )

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('API response data:', data)
    console.log('Is array?', Array.isArray(data))
    console.log('Data type:', typeof data)

    // Handle different response formats
    if (Array.isArray(data)) {
      console.log('Returning array with', data.length, 'items')
      return data
    } else if (data && typeof data === 'object') {
      // Check if data is wrapped in an object
      const possibleArrayKeys = ['data', 'travels', 'results', 'items']
      for (const key of possibleArrayKeys) {
        if (Array.isArray(data[key])) {
          console.log(`Found array at key '${key}' with`, data[key].length, 'items')
          return data[key]
        }
      }
      console.log('Data is object but no array found, keys:', Object.keys(data))
    }

    console.log('Returning empty array')
    return []
  } catch (error) {
    console.error('Error fetching active travels:', error)
    return []
  }
}
