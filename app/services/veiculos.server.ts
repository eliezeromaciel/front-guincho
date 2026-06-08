import { adminDb } from '~/services/firebaseAdmin.server';
import type { DocumentReference } from 'firebase-admin/firestore';

type PostVeiculoSuccess = {
  ok: true;
  docRef: DocumentReference;
};

type PostVeiculoError = {
  ok: false;
  error: unknown;
};

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
}

export const getVeiculos = async (): Promise<Veiculo[]> => {
  try {
    const snapshot = await adminDb.collection('veiculos').get();
    const result = snapshot.docs.map((elem) => ({
      id: elem.id,
      ...elem.data(),
    })) as Veiculo[];
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

export const updateVeiculo = async (id: string, data: Record<string, any>) => {
  try {
    await adminDb.collection('veiculos').doc(id).update(data);
    return { ok: true };
  } catch (error: any) {
    console.error('[updateVeiculo] erro:', error);
    return { ok: false, error: error?.message || 'Erro ao atualizar veículo' };
  }
};

export const deleteVeiculo = async (id: string) => {
  try {
    await adminDb.collection('veiculos').doc(id).delete();
    return { ok: true };
  } catch (error: any) {
    console.error('[deleteVeiculo] erro:', error);
    return { ok: false, error: error?.message || 'Erro ao deletar veículo' };
  }
};
