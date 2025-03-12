// api.ts (TypeScript)
import { BROKEN_CHAT_BASE_URL } from "./consts";

export const fetchWithPrefix = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BROKEN_CHAT_BASE_URL}${endpoint}`;
  
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
