// geolocation.ts

export const getPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      // Usa navigator.geolocation per ottenere la posizione del dispositivo
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: false, // <--- più veloce
          timeout: 5000, // <--- massimo 5 secondi
          maximumAge: 10000 // usa una posizione recente se disponibile (10 sec)
        }
      );
    });
  };
  