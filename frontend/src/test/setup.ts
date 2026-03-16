import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

// Polyfill ResizeObserver for recharts / other DOM-measuring libraries
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => { server.listen({ onUnhandledRequest: 'warn' }); });
afterEach(() => { server.resetHandlers(); });
afterAll(() => { server.close(); });
