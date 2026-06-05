import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface Seguradora {
  id?: string;
  nome: string;
  ativa: boolean;
  createdAt?: any;
}

export const getSeguradoras = async (): Promise<Seguradora[]> => {
  try {
    const snapshot = await adminDb.collection('seguradoras').orderBy('nome', 'asc').get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      nome: doc.data().nome,
      ativa: doc.data().ativa !== false,
    })) as Seguradora[];
    if (process.env.NODE_ENV === 'development') console.log('[getSeguradoras] result:', result.length, 'docs');
    return result;
  } catch (error: any) {
    console.error('[getSeguradoras] erro:', error?.code ?? 'unknown');
    return [];
  }
};

export const getSeguradorasAtivas = async (): Promise<Seguradora[]> => {
  const todas = await getSeguradoras();
  return todas.filter((s) => s.ativa);
};

export const postNovaSeguradora = async (nome: string) => {
  try {
    const docRef = await adminDb.collection('seguradoras').add({
      nome,
      ativa: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[postNovaSeguradora] result: ok');
    return { ok: true as const, docRef };
  } catch (error: any) {
    console.error('[postNovaSeguradora] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};

export const toggleSeguradora = async (id: string, ativa: boolean) => {
  try {
    await adminDb.collection('seguradoras').doc(id).update({ ativa });
    if (process.env.NODE_ENV === 'development') console.log('[toggleSeguradora] ok, ativa:', ativa);
    return { ok: true as const };
  } catch (error: any) {
    console.error('[toggleSeguradora] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};
