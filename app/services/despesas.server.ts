import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface Despesa {
  id?: string;
  caminhao: 'A' | 'B' | 'C';
  valorTotal: number;
  descricao: string;
  dataPagamento: string; // no formato 'YYYY-MM-DD'
  parcelas: number;
  valorParcela: number;
  createdAt?: any;
}

export const getDespesas = async (): Promise<Despesa[]> => {
  try {
    const snapshot = await adminDb.collection('despesas').get();
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        caminhao: data.caminhao,
        valorTotal: data.valorTotal,
        descricao: data.descricao,
        dataPagamento: data.dataPagamento,
        parcelas: data.parcelas || 1,
        valorParcela: data.valorParcela || data.valorTotal,
      } as Despesa;
    });
    if (process.env.NODE_ENV === 'development') console.log('[getDespesas] result:', result.length, 'docs');
    return result;
  } catch (error: any) {
    console.error('[getDespesas] erro:', error?.code ?? 'unknown');
    return [];
  }
};

export const postNovaDespesa = async (
  caminhao: 'A' | 'B' | 'C',
  valorTotal: number,
  descricao: string,
  dataPagamento: string,
  parcelas: number,
) => {
  try {
    const valorParcela = Number((valorTotal / parcelas).toFixed(2));
    const docRef = await adminDb.collection('despesas').add({
      caminhao,
      valorTotal,
      descricao,
      dataPagamento,
      parcelas,
      valorParcela,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (process.env.NODE_ENV === 'development') console.log('[postNovaDespesa] result: ok');
    return { ok: true, docRef };
  } catch (error: any) {
    console.error('[postNovaDespesa] erro:', error?.code ?? 'unknown');
    return { ok: false, error };
  }
};
