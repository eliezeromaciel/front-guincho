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
    if (process.env.NODE_ENV === 'development') console.log('[verificarFuncionarioExiste] exists:', snap.exists);
    return snap.exists;
  } catch (error: any) {
    console.error('[verificarFuncionarioExiste] erro:', error?.code ?? 'unknown');
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
    if (process.env.NODE_ENV === 'development') console.log('[getFuncionarios] result:', result.length, 'docs');
    return result;
  } catch (error: any) {
    console.error('[getFuncionarios] erro:', error?.code ?? 'unknown');
    return [];
  }
};

export const postNovoFuncionario = async (
  nome: string,
  email: string,
  senha: string,
  role: 'admin' | 'readonly',
  motorista: 'A' | 'B' | 'C' | 'none'
): Promise<{ ok: true; uid: string } | { ok: false; error: string }> => {
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

    if (process.env.NODE_ENV === 'development') console.log('[postNovoFuncionario] cadastrado com sucesso');
    return { ok: true as const, uid: userRecord.uid };
  } catch (error: any) {
    console.error('[postNovoFuncionario] erro:', error?.code ?? 'unknown');
    const mensagem =
      error?.code === 'auth/email-already-exists' ? 'E-mail já cadastrado.' :
      error?.code === 'auth/invalid-email'        ? 'E-mail inválido.' :
      error?.code === 'auth/weak-password'        ? 'Senha muito fraca.' :
      'Erro ao criar usuário.';
    return { ok: false as const, error: mensagem };
  }
};

