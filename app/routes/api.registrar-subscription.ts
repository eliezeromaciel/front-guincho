import { adminDb } from '~/services/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const FUNCIONARIOS_VALIDOS = ['daniel', 'gabriel'];

interface RegistrarBody {
  funcionario: string;
  pin: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}

export const action = async ({ request }: { request: Request }) => {
  const { funcionario, pin, subscription } = (await request.json()) as RegistrarBody;

  const nomeLower = funcionario.toLowerCase();

  if (!FUNCIONARIOS_VALIDOS.includes(nomeLower)) {
    return Response.json({ ok: false, error: 'Funcionário inválido.' }, { status: 400 });
  }

  const pinEsperado = process.env[`EMPLOYEE_PIN_${nomeLower.toUpperCase()}`]?.trim();
  if (!pinEsperado || pin.trim() !== pinEsperado) {
    console.log('[registrar-subscription] PIN inválido para:', funcionario);
    return Response.json({ ok: false, error: 'PIN incorreto.' }, { status: 401 });
  }

  try {
    await adminDb.collection('subscriptions').doc(nomeLower).set({
      funcionario: nomeLower,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[registrar-subscription] subscription registrada para:', funcionario);
    return Response.json({ ok: true });
  } catch (error) {
    console.log('[registrar-subscription] erro ao salvar:', error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
