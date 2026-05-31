import { redirect } from 'react-router';
import { adminAuth, adminDb } from './firebaseAdmin';

interface FuncionarioDoc {
  role?: string;
  nome?: string;
}

const COOKIE_NAME = 'app_session';
const DURACAO_MS = 60 * 60 * 24 * 7 * 1000;

export interface SessaoUsuario {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'readonly';
}

const cookieHeader = (valor: string, maxAge: number): string => {
  const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${valor}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Path=/${seguro}`;
};

const extrairCookie = (request: Request): string | null => {
  const header = request.headers.get('Cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
};

const criarCookieSessao = async (idToken: string): Promise<string> => {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: DURACAO_MS });
  return cookieHeader(sessionCookie, DURACAO_MS / 1000);
};

export const validarECriarSessao = async (
  idToken: string,
): Promise<{ ok: true; cookieHeader: string } | { ok: false; error: string }> => {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const snap = await adminDb.collection('funcionarios').doc(decoded.uid).get();
    if (!snap.exists) return { ok: false, error: 'Usuário sem permissão de acesso.' };
    const data = snap.data() as FuncionarioDoc;
    if (data.role !== 'admin' && data.role !== 'readonly') {
      return { ok: false, error: 'Usuário sem permissão de acesso.' };
    }
    const cookie = await criarCookieSessao(idToken);
    return { ok: true, cookieHeader: cookie };
  } catch {
    return { ok: false, error: 'Erro ao processar o acesso.' };
  }
};

export const verificarSessao = async (request: Request): Promise<SessaoUsuario | null> => {
  const token = extrairCookie(request);
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);

    const userRecord = await adminAuth.getUser(decoded.uid);
    if (userRecord.disabled) return null;

    const snap = await adminDb.collection('funcionarios').doc(decoded.uid).get();
    if (!snap.exists) return null;

    const data = snap.data() as FuncionarioDoc;
    const role = data.role;
    if (role !== 'admin' && role !== 'readonly') return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: data.nome ?? decoded.email ?? '',
      role,
    };
  } catch {
    return null;
  }
};

export const requireAuth = async (request: Request): Promise<SessaoUsuario> => {
  const sessao = await verificarSessao(request);
  if (!sessao) throw redirect('/login');
  return sessao;
};

export const requireAdmin = async (request: Request): Promise<SessaoUsuario> => {
  const sessao = await requireAuth(request);
  if (sessao.role !== 'admin') throw new Response('Acesso negado.', { status: 403 });
  return sessao;
};

export const destruirCookieSessao = async (request: Request): Promise<string> => {
  const token = extrairCookie(request);
  if (token) {
    try {
      const decoded = await adminAuth.verifySessionCookie(token);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch { /* token já inválido */ }
  }
  return cookieHeader('', 0);
};
