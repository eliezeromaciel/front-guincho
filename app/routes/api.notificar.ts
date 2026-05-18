import { enviarNotificacaoServidor } from '~/services/webpush.server';

if (!process.env.INTERNAL_API_SECRET) {
  throw new Error('[api.notificar] INTERNAL_API_SECRET não configurada.');
}

export const loader = async () => new Response(null, { status: 405 });

interface NotificarBody {
  funcionario: string;
  titulo: string;
  corpo: string;
}

export const action = async ({ request }: { request: Request }) => {
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const funcionario = typeof body.funcionario === 'string' ? body.funcionario.slice(0, 128) : null;
  const titulo = typeof body.titulo === 'string' ? body.titulo.slice(0, 100) : null;
  const corpo = typeof body.corpo === 'string' ? body.corpo.slice(0, 300) : null;

  if (!funcionario || !titulo || !corpo)
    return Response.json({ ok: false }, { status: 400 });

  await enviarNotificacaoServidor(funcionario, titulo, corpo);
  return Response.json({ ok: true });
};
