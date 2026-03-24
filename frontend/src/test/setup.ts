import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

// Polyfill ResizeObserver for recharts / other DOM-measuring libraries
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver for animation / reveal hooks
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;

// Polyfill HTMLCanvasElement.getContext for canvas-based components (e.g. GridCanvas)
HTMLCanvasElement.prototype.getContext = () => null;

beforeAll(() => { server.listen({ onUnhandledRequest: 'warn' }); });
afterEach(() => { server.resetHandlers(); });
afterAll(() => { server.close(); });
