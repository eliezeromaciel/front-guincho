import { adminDb, adminAuth } from '~/services/firebaseAdmin';

export interface Funcionario {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'readonly';
  motorista: 'A' | 'B' | 'C' | 'none';
}

interface FuncionarioDoc {
  nome?: string;
  email?: string;
  role?: 'admin' | 'readonly';
  motorista?: 'A' | 'B' | 'C' | 'none';
}

export const verificarFuncionarioExiste = async (uid: string): Promise<boolean> => {
  try {
    const snap = await adminDb.collection('funcionarios').doc(uid).get();
    console.log('[verificarFuncionarioExiste] uid:', uid, 'exists:', snap.exists);
    return snap.exists;
  } catch (error) {
    console.log('[verificarFuncionarioExiste] erro:', error);
    return false;
  }
};

export const getFuncionarios = async (): Promise<Funcionario[]> => {
  try {
    const snap = await adminDb.collection('funcionarios').get();
    const result = snap.docs.flatMap((doc) => {
      const data = doc.data() as FuncionarioDoc;
      return data.nome
        ? [
            {
              uid: doc.id,
              displayName: data.nome,
              email: data.email || '',
              role: data.role || 'readonly',
              motorista: data.motorista || 'none',
            },
          ]
        : [];
    });
    console.log('[getFuncionarios] result:', result.length, 'docs');
    return result;
  } catch (error) {
    console.log('[getFuncionarios] erro:', error);
    return [];
  }
};

export const postNovoFuncionario = async (
  nome: string,
  email: string,
  senha: string,
  role: 'admin' | 'readonly',
  motorista: 'A' | 'B' | 'C' | 'none'
): Promise<{ ok: true; uid: string } | { ok: false; error: unknown }> => {
  try {
    // 1. Criar no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password: senha,
      displayName: nome,
    });

    // 2. Criar registro no Firestore
    await adminDb.collection('funcionarios').doc(userRecord.uid).set({
      nome,
      email,
      role,
      motorista,
    });

    const result = { ok: true as const, uid: userRecord.uid };
    console.log('[postNovoFuncionario] cadastrado com sucesso:', result);
    return result;
  } catch (error) {
    const result = { ok: false as const, error };
    console.log('[postNovoFuncionario] erro ao cadastrar:', result);
    return result;
  }
};

