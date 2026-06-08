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

export const updateDespesa = async (despesaId: string, campos: Partial<Despesa>) => {
  try {
    const update: Record<string, any> = { ...campos };
    // Recalcula valorParcela automaticamente se valor ou parcelas mudarem
    if (campos.valorTotal !== undefined || campos.parcelas !== undefined) {
      const snap = await adminDb.collection('despesas').doc(despesaId).get();
      const atual = snap.data() as Despesa;
      const novoTotal = campos.valorTotal ?? atual.valorTotal;
      const novaParcelas = campos.parcelas ?? atual.parcelas;
      update.valorParcela = Number((novoTotal / novaParcelas).toFixed(2));
    }
    await adminDb.collection('despesas').doc(despesaId).update(update);
    if (process.env.NODE_ENV === 'development') console.log('[updateDespesa] ok', Object.keys(update));
    return { ok: true as const };
  } catch (error: any) {
    console.error('[updateDespesa] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};

export const deleteDespesa = async (despesaId: string) => {
  try {
    await adminDb.collection('despesas').doc(despesaId).delete();
    if (process.env.NODE_ENV === 'development') console.log('[deleteDespesa] ok');
    return { ok: true as const };
  } catch (error: any) {
    console.error('[deleteDespesa] erro:', error?.code ?? 'unknown');
    return { ok: false as const, error };
  }
};
