import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface Despesa {
  id?: string;
  caminhao?: 'A' | 'B' | 'C'; // Mantido para retrocompatibilidade
  centroCustoId?: string;
  categoriaId?: string;
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
        centroCustoId: data.centroCustoId,
        categoriaId: data.categoriaId,
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
  despesaData: {
    caminhao?: 'A' | 'B' | 'C';
    centroCustoId?: string;
    categoriaId?: string;
    valorTotal: number;
    descricao: string;
    dataPagamento: string;
    parcelas: number;
  }
) => {
  try {
    const valorParcela = Number((despesaData.valorTotal / despesaData.parcelas).toFixed(2));
    
    // Constrói o objeto apenas com campos definidos
    const payload: any = {
      valorTotal: despesaData.valorTotal,
      descricao: despesaData.descricao,
      dataPagamento: despesaData.dataPagamento,
      parcelas: despesaData.parcelas,
      valorParcela,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (despesaData.caminhao) payload.caminhao = despesaData.caminhao;
    if (despesaData.centroCustoId) payload.centroCustoId = despesaData.centroCustoId;
    if (despesaData.categoriaId) payload.categoriaId = despesaData.categoriaId;

    const docRef = await adminDb.collection('despesas').add(payload);
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
