function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const registrarSubscription = async (funcionario: string, pin: string): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[notificacoes] Push não suportado neste dispositivo');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[notificacoes] permissão negada pelo usuário');
      return false;
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    console.log('[notificacoes] vapidKey:', vapidKey); // adicione esta linha
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const sub = subscription.toJSON();
    const response = await fetch('/api/registrar-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        funcionario,
        pin,
        subscription: { endpoint: sub.endpoint, keys: sub.keys },
      }),
    });

    const result = await response.json();
    console.log('[notificacoes] resultado do registro:', result);
    return result.ok === true;
  } catch (error) {
    console.log('[notificacoes] erro ao registrar subscription:', error);
    return false;
  }
};

export const enviarNotificacao = async (
  funcionario: string,
  titulo: string,
  corpo: string
): Promise<void> => {
  try {
    const response = await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcionario, titulo, corpo }),
    });
    const result = await response.json();
    console.log('[notificacoes] resultado do envio:', result);
  } catch (error) {
    console.log('[notificacoes] erro ao chamar API de notificação:', error);
  }
};
