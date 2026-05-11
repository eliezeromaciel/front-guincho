import { redirect } from 'react-router';
import { destruirCookieSessao } from '~/services/session.server';

export const action = async () => {
  const cookieHeader = await destruirCookieSessao();
  return redirect('/login', { headers: { 'Set-Cookie': cookieHeader } });
};
