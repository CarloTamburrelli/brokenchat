// webPush.js

const webpush = require('web-push');

// Configura le chiavi VAPID (sostituisci con le tue chiavi)
const vapidKeys = {
  publicKey:  process.env.VAPID_PUBLIC_KEY,  // Sostituisci con la chiave pubblica generata
  privateKey: process.env.VAPID_PRIVATE_KEY, // Sostituisci con la chiave privata generata
};

// Imposta le chiavi VAPID
webpush.setVapidDetails(
  'mailto:tamburrelli.carlo@gmail.com', // Email dell'amministratore
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Funzione per inviare la notifica
function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, payload)
    .then(response => {
      console.log('Notifica inviata con successo:', response);
    })
    .catch(err => {
      console.error('Errore nell\'invio della notifica:', err);
    });
}

module.exports = {
  sendPushNotification,
};
