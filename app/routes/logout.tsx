import { redirect } from 'react-router';
import { destruirCookieSessao } from '~/services/session.server';

export const loader = async () => redirect('/login');

export const action = async ({ request }: { request: Request }) => {
  const cookieHeader = await destruirCookieSessao(request);
  return redirect('/login', { headers: { 'Set-Cookie': cookieHeader } });
};
