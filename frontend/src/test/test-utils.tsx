import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth';

const defaultAuth: AuthContextValue = {
  userId: 'user-1',
  orgId: 'org-1',
  token: 'test-token',
  role: 'MANAGER',
  displayName: 'Alice Smith',
};

interface WrapperOptions {
  auth?: Partial<AuthContextValue>;
  queryClient?: QueryClient;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(opts: WrapperOptions = {}) {
  const qc = opts.queryClient ?? makeQueryClient();
  const authValue: AuthContextValue = { ...defaultAuth, ...opts.auth };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <QueryClientProvider client={qc}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  auth?: Partial<AuthContextValue>;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  opts: CustomRenderOptions = {}
): RenderResult {
  const { auth, queryClient, ...renderOptions } = opts;
  const wrapperOpts: WrapperOptions = {};
  if (auth !== undefined) wrapperOpts.auth = auth;
  if (queryClient !== undefined) wrapperOpts.queryClient = queryClient;
  const Wrapper = createWrapper(wrapperOpts);
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { makeQueryClient };
export * from '@testing-library/react';
