import { requireAuth } from '~/services/session.server';

export const loader = async () => new Response(null, { status: 405 });

interface SubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const action = async ({ request }: { request: Request }) => {
  let sessao;
  try {
    sessao = await requireAuth(request);
  } catch {
    return Response.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { endpoint, keys } = (await request.json()) as SubscriptionBody;

    if (
      typeof endpoint !== 'string' ||
      !endpoint.startsWith('https://') ||
      endpoint.length > 512 ||
      typeof keys?.p256dh !== 'string' ||
      keys.p256dh.length > 200 ||
      typeof keys?.auth !== 'string' ||
      keys.auth.length > 50
    ) {
      return Response.json({ ok: false, error: 'Subscription inválida.' }, { status: 400 });
    }

    const { salvarSubscription } = await import('~/services/webpush.server');
    const result = await salvarSubscription(sessao.uid, sessao.displayName, endpoint, keys);
    
    if (!result.ok) {
      return Response.json({ ok: false, error: 'Erro ao salvar subscription no banco.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.log('[registrar-subscription] erro:', error);
    return Response.json({ ok: false, error: 'Erro interno.' }, { status: 500 });
  }
};
