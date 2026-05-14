import { createCookie, redirect } from 'react-router';

const sessionCookie = createCookie('app_session', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7,
  secrets: [process.env.SESSION_SECRET!],
});

export const verificarSessao = async (request: Request): Promise<boolean> => {
  const cookieHeader = request.headers.get('Cookie');
  const valor = await sessionCookie.parse(cookieHeader);
  return valor === 'authenticated';
};

export const requireAuth = async (request: Request): Promise<void> => {
  if (!(await verificarSessao(request))) {
    throw redirect('/login');
  }
};

export const criarCookieSessao = async (): Promise<string> => {
  return sessionCookie.serialize('authenticated');
};

export const destruirCookieSessao = async (): Promise<string> => {
  return sessionCookie.serialize('', { maxAge: 0 });
};
