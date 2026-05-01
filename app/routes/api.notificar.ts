import { db } from '~/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:eliezermaciel@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificarBody {
  funcionario: string;
  titulo: string;
  corpo: string;
}

export const action = async ({ request }: { request: Request }) => {
  const { funcionario, titulo, corpo } = (await request.json()) as NotificarBody;

  const snap = await getDoc(doc(db, 'subscriptions', funcionario.toLowerCase()));
  if (!snap.exists()) {
    console.log('[notificar] subscription não encontrada para:', funcionario);
    return Response.json(
      { ok: false, error: 'Funcionário não registrou notificações ainda.' },
      { status: 404 }
    );
  }

  const data = snap.data();
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
      JSON.stringify({ title: titulo, body: corpo, tag: 'novo-servico' })
    );
    console.log('[notificar] notificação enviada para:', funcionario);
    return Response.json({ ok: true });
  } catch (error) {
    console.log('[notificar] erro ao enviar notificação:', error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
