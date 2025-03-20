import React, { createContext, useContext, useState, useEffect } from "react";
import { getPosition } from "../utils/geolocation"; // Funzione che richiede la posizione

// Definizione del contesto
const LocationContext = createContext<{
  lat: number | null;
  lon: number | null;
  error: string | null;
  requestLocation: () => void;
} | null>(null);

// Provider che gestisce la posizione
export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funzione per ottenere la posizione
  const fetchLocation = async (manual_check?: boolean) => {
    try {
      const position = await getPosition();
      setLat(position.latitude);
      setLon(position.longitude);
      setError(null); // Reset dell'errore se la posizione è ottenuta con successo
    } catch (err: any) {
      if (manual_check) {
        alert("Errore nel recuperare la posizione: " + err.message);
      }
      setError(err.message); // Memorizza l'errore
      console.error("Errore nel recuperare la posizione:", err);
    }
  };

  // Chiedi la posizione automaticamente all'inizio
  useEffect(() => {
    fetchLocation();
  }, []);

  // Permette di richiedere di nuovo la posizione con il bottone
  const requestLocation = () => {
    fetchLocation(true);
  };

  return (
    <LocationContext.Provider value={{ lat, lon, error, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

// Hook per accedere alla posizione ovunque
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation deve essere usato all'interno di LocationProvider");
  }
  return context;
};
