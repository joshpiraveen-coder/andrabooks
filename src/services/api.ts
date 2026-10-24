export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export async function apiRequest<T>(path: string, options: RequestInit = {}, authenticated: boolean | string = false): Promise<T> {
  if (!API_URL) throw new Error('API is not configured.');
  const token = localStorage.getItem('andra:token');
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const authToken = typeof authenticated === 'string' ? localStorage.getItem(authenticated) : authenticated ? token : null;
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  const response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `API request failed (${response.status}).`;
    try { const body = await response.json() as { error?: string }; if (body.error) message = body.error; } catch { /* Keep the HTTP status message. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiJson = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
