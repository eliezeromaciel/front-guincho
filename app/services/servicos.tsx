import { adminDb } from '~/services/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { enviarNotificacaoServidor } from '~/services/webpush.server';

export const getServicos = async () => {
  try {
    const snapshot = await adminDb.collection('servicos').get();
    const result = snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data(),
    }));
    console.log('[getServicos] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getServicos] erro:', error);
  }
  return [];
};

export const postNovoServico = async (
  idClient: string,
  idVeiculo: string,
  amountCharged: string,
  receiver: string,
  pickUpAdress: string,
  deliveryAdress: string,
) => {
  try {
    const docRef = await adminDb.collection('servicos').add({
      clienteId: idClient,
      veiculoId: idVeiculo,
      valorCobrado: amountCharged,
      receiver,
      pickUpAdress,
      deliveryAdress,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log('[postNovoServico] result:', { ok: true, docRef });

    await enviarNotificacaoServidor(
      receiver,
      'Novo serviço atribuído!',
      `Retirada: ${pickUpAdress}`,
    );

    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovoServico] result:', { ok: false, error });
    return { ok: false, error };
  }
};
