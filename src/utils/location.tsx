export async function getLocationName(lat: number, lon: number) {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY; // Ottieni la chiave API dal file .env
    if (!apiKey) {
      throw new Error("API Key non trovata!");
    }
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].name;
    } else {
      return null;
    }
}