/**
 * Fetches data from a JSON file based on the date, origin, and destination.
 * This function returns the raw JSON data without any specific type checking.
 *
 * @param date The date of the route in 'YYYY-MM-DD' format.
 * @param origin The starting point of the route.
 * @param destination The ending point of the route.
 * @returns A promise that resolves with the JSON data as 'any'.
 */
export const getData = async (date: string, origin: string, destination:string): Promise<any> => {
  // Construct the file path from the function arguments.
  const originUpperCase = origin.toUpperCase();
  const destinationUpperCase = destination.toUpperCase();
  const filePath = `/mock/${date}/${originUpperCase}-${destinationUpperCase}.json`;

  try {
    // Fetch the data from the specified path in the 'public' folder.
    const response = await fetch(filePath);

    // If the file is not found or another error occurs, throw an error.
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    // Parse the response body as JSON and return it.
    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error fetching data:", error);
    // Re-throw the error so the calling code can handle it.
    throw error;
  }
};