import { enviarNotificacaoServidor } from '~/services/webpush.server';

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

  const { funcionario, titulo, corpo } = (await request.json()) as NotificarBody;

  await enviarNotificacaoServidor(funcionario, titulo, corpo);
  return Response.json({ ok: true });
};
