import { adminDb } from '~/services/firebaseAdmin';

export interface Funcionario {
  uid: string;
  displayName: string;
}

interface FuncionarioDoc {
  nome?: string;
}

export const getFuncionarios = async (): Promise<Funcionario[]> => {
  try {
    const snap = await adminDb.collection('funcionarios').get();
    const result = snap.docs.flatMap((doc) => {
      const data = doc.data() as FuncionarioDoc;
      return data.nome ? [{ uid: doc.id, displayName: data.nome }] : [];
    });
    console.log('[getFuncionarios] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getFuncionarios] erro:', error);
    return [];
  }
};
