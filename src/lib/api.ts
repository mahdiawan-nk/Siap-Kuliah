/**
 * SIAP-KULIAH API Client
 */

const BASE_URL = '/api/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem('siap_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('siap_token', token);
  } else {
    localStorage.removeItem('siap_token');
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({ success: false, message: 'Respons server tidak valid' }));

  if (!res.ok) {
    throw new Error(data.message || `Permintaan gagal dengan status ${res.status}`);
  }

  return data.data !== undefined ? data.data : data;
}
