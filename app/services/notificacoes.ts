function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const registrarSubscriptionAutomaticamente = async (): Promise<void> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[notificacoes] Push não suportado neste dispositivo');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[notificacoes] permissão negada pelo usuário');
      return;
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const sub = subscription.toJSON();
    const response = await fetch('/api/registrar-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
    });

    const result = await response.json();
    console.log('[notificacoes] resultado do registro:', result);
  } catch (error) {
    console.log('[notificacoes] erro ao registrar subscription:', error);
  }
};
