export interface ApiRequestOptions<Body = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  searchParams?: Record<string, string | number | boolean | undefined>;
  body?: Body;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export class ApiClient {
  async request<Response, Body = unknown>(
    path: string,
    { method = 'GET', searchParams, body, headers, signal }: ApiRequestOptions<Body> = {}
  ): Promise<Response> {
    const url = this.buildUrl(path, searchParams);
    const requestId = Math.random().toString(36).slice(2, 8);
    console.log('[API]', requestId, '→', method, url, { body, headers });
    
    // Only include JSON_HEADERS for methods that can have a body (not GET)
    const requestHeaders: HeadersInit = 
      method !== 'GET'
        ? { ...JSON_HEADERS, ...headers }
        : { ...headers };
    
    const init: RequestInit = {
      method,
      headers: requestHeaders,
      ...(signal && { signal }),
    };

    if (body !== undefined && method !== 'GET') {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, init).catch((err) => {
      console.error('[API]', requestId, '✖ fetch failed', err);
      throw err;
    });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      console.error('[API]', requestId, '✖', response.status, response.statusText, payload);
      throw new ApiError(response.statusText || 'Request failed', response.status, payload);
    }

    console.log('[API]', requestId, '✓', response.status, payload);
    return payload as Response;
  }

  async get<Response>(
    path: string,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<Response> {
    return this.request<Response>(path, { ...options, method: 'GET' });
  }

  async post<Response, Body = unknown>(
    path: string,
    body: Body,
    options?: Omit<ApiRequestOptions<Body>, 'method' | 'body'>
  ): Promise<Response> {
    return this.request<Response, Body>(path, { ...options, method: 'POST', body });
  }

  private buildUrl(
    path: string,
    searchParams?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, window.location.origin);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }
}

export const apiClient = new ApiClient();

