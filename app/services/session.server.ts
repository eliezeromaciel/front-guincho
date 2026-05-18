import { redirect } from 'react-router';
import { adminAuth } from './firebaseAdmin';

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

export const criarCookieSessao = async (idToken: string): Promise<string> => {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: DURACAO_MS });
  return cookieHeader(sessionCookie, DURACAO_MS / 1000);
};

export const verificarSessao = async (request: Request): Promise<SessaoUsuario | null> => {
  const token = extrairCookie(request);
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const role = decoded['role'];
    if (role !== 'admin' && role !== 'readonly') return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: (decoded['name'] as string) ?? decoded.email ?? '',
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
