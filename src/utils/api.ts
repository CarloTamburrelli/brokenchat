// api.ts (TypeScript)
const BASE_URL = 'http://192.168.1.10:5000';

export const fetchWithPrefix = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return response.json().then((errorData) => {
        throw new Error(errorData.message || response.statusText);
      });
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error; // Propaga l'errore per una gestione centralizzata
  }
};
