import webpush from 'web-push';
import { adminDb } from '~/services/firebaseAdmin';

webpush.setVapidDetails(
  'mailto:eliezermaciel@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export const enviarNotificacaoServidor = async (
  funcionario: string,
  titulo: string,
  corpo: string,
): Promise<void> => {
  const snap = await adminDb.collection('subscriptions').doc(funcionario.toLowerCase()).get();
  if (!snap.exists) {
    console.log('[webpush] subscription não encontrada para:', funcionario);
    return;
  }

  const data = snap.data()!;
  const subscription: webpush.PushSubscription = {
    endpoint: data.endpoint as string,
    keys: {
      p256dh: data.keys.p256dh as string,
      auth: data.keys.auth as string,
    },
  };

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: titulo, body: corpo, tag: 'novo-servico' }),
    );
    console.log('[webpush] notificação enviada para:', funcionario);
  } catch (error) {
    console.log('[webpush] erro ao enviar notificação para:', funcionario, error);
  }
};
