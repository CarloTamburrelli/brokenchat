export const getPosition = (): Promise<{ latitude: number; longitude: number, mode: number }> => {
  return new Promise( async (resolve, reject) => {
    let resolved = false;
    const timeoutTotal = 5000;

    // Timeout globale
    const totalTimeout = setTimeout(() => {
      /*
        Durante questo tempo di 5 secondi Broken Chat proverà a recuperare la posizione in 3 modi diversi:
        - per posizione corrente in massimo 1 secondo e mezzo
        - tramite un watcher per massimo 2 secondi
        - per posizione IP
      */


      if (!resolved) {
        resolved = true;
        reject(new Error("Broken Chat failed to retrieve your location within 5 seconds."));
      }
    }, timeoutTotal);

    // 1. Primo tentativo: getCurrentPosition veloce
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(totalTimeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          mode: 1
        });
      },
      async () => {
        // 2. Secondo tentativo: watchPosition con high accuracy
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(totalTimeout);
            navigator.geolocation.clearWatch(watchId);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              mode: 2
            });
          },
          async () => {
            navigator.geolocation.clearWatch(watchId);
            // 3. Terzo tentativo: fallback con ipapi
            fetch('https://ipapi.co/json/')
              .then((res) => res.json())
              .then((data) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(totalTimeout);
                if (data.latitude && data.longitude) {
                  resolve({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    mode: 3
                  });
                } else {
                  reject(new Error("Fallback IP: posizione non disponibile"));
                }
              })
              .catch(() => {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(totalTimeout);
                  reject(new Error("Errore nel recupero posizione da IP"));
                }
              });
          },
          {
            enableHighAccuracy: true,
            timeout: 2000,
            maximumAge: 0,
          }
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 1500,
        maximumAge: 10000,
      }
    );
  });
};
