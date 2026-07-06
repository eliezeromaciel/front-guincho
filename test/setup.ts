import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as mockFirebase from './mocks/firebaseAdmin';
import * as mockSession from './mocks/session';

// Mocks globais para reduzir boilerplate nos testes individuais
vi.mock('~/services/firebaseAdmin.server', () => mockFirebase);
vi.mock('~/services/session.server', () => mockSession);
