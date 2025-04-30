import { useEffect } from 'react';
import { fetchWithPrefix } from '../utils/api'; // o dove l'hai salvata tu

interface SubscriptionBody {
  userId: number;
  subscription: PushSubscription;
}

export default function usePushNotifications(userId: number) {
  useEffect(() => {
    if (!userId) return; // Non fare nulla se l'utente non è loggato
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    async function registerPush() {
      try {
        // Verifica se l'utente ha già una subscription
        const response = await fetchWithPrefix(`/check-webpush-subscription/${userId}`);


        //console.log("RISPOSTONA", response)

        if (response.subscription) {
          console.log('User already has a web push subscription.');
          return; // L'utente ha già una subscription, quindi non fare nulla
        }

        // Se non ha una subscription, registriamo una nuova
        const registration = await navigator.serviceWorker.register('/service-worker-v3.js');
        console.log('Service Worker registered:', registration);

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Permission denied for notifications');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
        });

        console.log('New Subscription:', subscription);

        const body: SubscriptionBody = {
          userId,
          subscription,
        };

        // Salva la nuova subscription nel database
        await fetchWithPrefix(`/register-webpush`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        console.log('Subscription saved successfully!');
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    }

    registerPush();
  }, [userId]);
}

// Helper per VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
