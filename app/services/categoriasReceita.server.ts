import { adminDb } from '~/services/firebaseAdmin.server';
import { FieldValue } from 'firebase-admin/firestore';

export interface CategoriaReceita {
  id?: string;
  nome: string;
  cor: string;
  isSystem: boolean;
  createdAt?: any;
}

const COLLECTION = 'categorias_receita';

// Semeia categorias básicas se não existirem
export const semearCategoriasPadrao = async (): Promise<void> => {
  try {
    const snapshot = await adminDb.collection(COLLECTION).get();
    const docs = snapshot.docs.map(doc => doc.data().nome.trim().toLowerCase());

    // 1. Serviço de Guincho (Cor Azul)
    if (!docs.includes('serviço de guincho')) {
      await adminDb.collection(COLLECTION).add({
        nome: 'Serviço de Guincho',
        cor: '#2563eb',
        isSystem: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 2. Fatura de Seguradora (Cor Verde default)
    if (!docs.includes('fatura de seguradora')) {
      await adminDb.collection(COLLECTION).add({
        nome: 'Fatura de Seguradora',
        cor: '#16a34a',
        isSystem: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('[semearCategoriasPadrao] erro ao semear:', error);
  }
};

export const getCategoriasReceita = async (): Promise<CategoriaReceita[]> => {
  try {
    let snapshot = await adminDb.collection(COLLECTION).orderBy('nome', 'asc').get();
    
    // Se estiver vazio, realiza a semeadura
    if (snapshot.empty) {
      await semearCategoriasPadrao();
      snapshot = await adminDb.collection(COLLECTION).orderBy('nome', 'asc').get();
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        cor: data.cor,
        isSystem: !!data.isSystem,
        createdAt: data.createdAt,
      } as CategoriaReceita;
    });
  } catch (error: any) {
    console.error('[getCategoriasReceita] erro:', error?.code ?? error);
    return [];
  }
};

export const postCategoriaReceita = async (nome: string, cor: string) => {
  try {
    if (!nome || !nome.trim()) {
      return { ok: false as const, error: 'Nome da categoria é obrigatório.' };
    }

    // Verificar se já existe uma com o mesmo nome
    const snapshot = await adminDb.collection(COLLECTION).get();
    const nomeNormalizado = nome.trim().toLowerCase();
    const duplicada = snapshot.docs.some(
      (doc) => doc.data().nome?.trim().toLowerCase() === nomeNormalizado
    );

    if (duplicada) {
      return { ok: false as const, error: 'Já existe uma categoria com este nome.' };
    }

    const docRef = await adminDb.collection(COLLECTION).add({
      nome: nome.trim(),
      cor: cor || '#9ca3af',
      isSystem: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true as const, id: docRef.id };
  } catch (error: any) {
    console.error('[postCategoriaReceita] erro:', error?.code ?? error);
    return { ok: false as const, error: error?.message || 'Erro desconhecido' };
  }
};

export const updateCategoriaReceita = async (id: string, campos: Partial<CategoriaReceita>) => {
  try {
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { ok: false as const, error: 'Categoria não encontrada.' };
    }

    const data = doc.data();
    const novosCampos: any = {};

    // Se for do sistema, só permite editar a cor
    if (data?.isSystem) {
      if (campos.cor) {
        novosCampos.cor = campos.cor;
      }
    } else {
      if (campos.nome && campos.nome.trim()) {
        novosCampos.nome = campos.nome.trim();
      }
      if (campos.cor) {
        novosCampos.cor = campos.cor;
      }
    }

    if (Object.keys(novosCampos).length > 0) {
      await docRef.update(novosCampos);
    }

    return { ok: true as const };
  } catch (error: any) {
    console.error('[updateCategoriaReceita] erro:', error?.code ?? error);
    return { ok: false as const, error: error?.message || 'Erro desconhecido' };
  }
};

export const deleteCategoriaReceita = async (id: string) => {
  try {
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { ok: false as const, error: 'Categoria não encontrada.' };
    }

    const data = doc.data();
    if (data?.isSystem) {
      return { ok: false as const, error: 'Categorias do sistema não podem ser excluídas.' };
    }

    await docRef.delete();
    return { ok: true as const };
  } catch (error: any) {
    console.error('[deleteCategoriaReceita] erro:', error?.code ?? error);
    return { ok: false as const, error: error?.message || 'Erro desconhecido' };
  }
};
