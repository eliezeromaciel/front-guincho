import { vi } from 'vitest';

// Exportando os mocks individuais para permitir manipulação nos testes (mockResolvedValue, mockRejectedValue, etc)
export const mockAdd = vi.fn();
export const mockGet = vi.fn();
export const mockUpdate = vi.fn();
export const mockDelete = vi.fn();
export const mockSet = vi.fn();
export const mockCount = vi.fn(() => ({
  get: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) }))
}));

export const mockDoc = vi.fn((docId?: string) => ({
  get: vi.fn(() => Promise.resolve({
    exists: true,
    id: docId || 'mock-id',
    data: () => ({})
  })),
  set: mockSet,
  update: mockUpdate,
  delete: mockDelete,
  collection: vi.fn(() => ({
    count: mockCount,
    get: mockGet,
    add: mockAdd,
  }))
}));

const queryMethods = () => {
  const query: any = {
    get: mockGet,
    orderBy: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(() => query),
  };
  return query;
};

export const mockCollection = vi.fn((name: string) => ({
  orderBy: vi.fn(queryMethods),
  where: vi.fn(queryMethods),
  limit: vi.fn(queryMethods),
  get: mockGet,
  add: mockAdd,
  doc: mockDoc,
}));

export const adminDb = {
  collection: mockCollection,
};

export const adminAuth = {
  createUser: vi.fn(),
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
  getUser: vi.fn(),
  revokeRefreshTokens: vi.fn(),
};
