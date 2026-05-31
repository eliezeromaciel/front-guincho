import { adminDb } from '~/services/firebaseAdmin';
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
    console.log('[getDespesas] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getDespesas] erro:', error);
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
    console.log('[postNovaDespesa] result:', { ok: true, id: docRef.id });
    return { ok: true, docRef };
  } catch (error) {
    console.log('[postNovaDespesa] erro:', error);
    return { ok: false, error };
  }
};
