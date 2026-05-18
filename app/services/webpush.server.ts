import webpush from 'web-push';
import { adminDb } from '~/services/firebaseAdmin';

const vapidContact = process.env.VAPID_CONTACT;
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidContact || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error('[webpush] VAPID_CONTACT, VITE_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são obrigatórias.');
}

webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey);

export const enviarNotificacaoServidor = async (
  uid: string,
  titulo: string,
  corpo: string,
): Promise<void> => {
  const snap = await adminDb.collection('subscriptions').doc(uid).get();
  if (!snap.exists) {
    console.log('[webpush] subscription não encontrada para uid:', uid);
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
    console.log('[webpush] notificação enviada para uid:', uid);
  } catch (error) {
    console.log('[webpush] erro ao enviar notificação para uid:', uid, error);
  }
};
