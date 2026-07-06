import { vi } from 'vitest';

export const mockRequireAdmin = vi.fn().mockResolvedValue({
  uid: 'admin-mock-123',
  email: 'admin@mock.com',
  displayName: 'Admin Mock',
  role: 'admin',
});

export const mockRequireAuth = vi.fn().mockResolvedValue({
  uid: 'user-mock-123',
  email: 'user@mock.com',
  displayName: 'User Mock',
  role: 'readonly',
});

export const mockVerificarSessao = vi.fn().mockResolvedValue({
  uid: 'user-mock-123',
  email: 'user@mock.com',
  displayName: 'User Mock',
  role: 'readonly',
});

export const requireAdmin = mockRequireAdmin;
export const requireAuth = mockRequireAuth;
export const verificarSessao = mockVerificarSessao;
export const validarECriarSessao = vi.fn();
export const destruirCookieSessao = vi.fn();
