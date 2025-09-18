self.addEventListener('push', function (event) {
    console.log("ricevuta!", event);

    let payload = { title: 'Nuovo messaggio', body: 'Hai un nuovo messaggio', data: {} };

    try {
      if (event.data) {
        payload = event.data.json(); // <-- Leggi JSON correttamente
      }
    } catch (e) {
      console.error("Errore nel parsing del payload:", e);
    }

    const options = {
      body: payload.body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: payload.data, // Serve per usarlo nel click
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  });
  
  // Gestisci il click sulla notifica
  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
  
    const url = event.notification.data?.url;
  
    if (url) {
      event.waitUntil(clients.openWindow(url));
    } else {
      event.waitUntil(clients.openWindow('https://broken.chat'));
    }
  });
  