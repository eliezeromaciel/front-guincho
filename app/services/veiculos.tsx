import { adminDb } from '~/services/firebaseAdmin';
import type { DocumentReference } from 'firebase-admin/firestore';

type PostVeiculoSuccess = {
  ok: true;
  docRef: DocumentReference;
};

type PostVeiculoError = {
  ok: false;
  error: unknown;
};

export const getVeiculos = async () => {
  try {
    const snapshot = await adminDb.collection('veiculos').get();
    const result = snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data(),
    }));
    console.log('[getVeiculos] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getVeiculos] erro:', error);
    return [];
  }
};

export const postNovoVeiculo = async (
  plate: string,
  model: string,
): Promise<PostVeiculoSuccess | PostVeiculoError> => {
  try {
    const docRef = await adminDb.collection('veiculos').add({
      placa: plate,
      modelo: model,
    });
    console.log('[postNovoVeiculo] result:', { ok: true, docRef });
    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovoVeiculo] result:', { ok: false, error });
    return { ok: false, error };
  }
};
