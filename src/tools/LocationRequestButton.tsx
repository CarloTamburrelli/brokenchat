import React from "react";
import { useLocation } from "../base/LocationContext"; // Usa il contesto della posizion
import warning from "../assets/warning.png"

const LocationRequestButton: React.FC = () => {
  const { lat, lon, requestLocation } = useLocation();

  // Mostra il bottone solo se lat e lon sono null
  if (lat !== null && lon !== null) {
    return null;
  }

  return (
    <button
  onClick={requestLocation}
  className="w-screen font-mono mt-2 mx-2 sm:mx-0 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg text-sm sm:text-base lg:text-md flex items-center justify-center"
>
  {/* Triangolo di attenzione */}
  <img 
    src={warning}  // Percorso dell'immagine
    alt="Attenzione"
    className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-3"
  />
  {/* Testo del bottone */}
  You can't see nearby chats. Click here to grant location permissions.
</button>

  );
};

export default LocationRequestButton;
