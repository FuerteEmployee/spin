// Same origin by default (the Express server serves the site). When the site is static hosting
// and the API runs elsewhere, VITE_API_URL is the API's full URL ending in /api.
const API_BASE = (import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`).replace(/\/+$/, '');

export class ServiceError extends Error {
  constructor(message, code, data = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

// fetch() wrapper: JSON in and out, a Blob body is sent as-is (image uploads).
// Errors become ServiceError with the server's message; 401 always has code UNAUTHORIZED.
export async function request(path, { method = 'GET', body, token, raw = false } = {}) {
  const init = { method, headers: {} };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body instanceof Blob) {
    init.body = body;
    init.headers['Content-Type'] = body.type || 'application/octet-stream';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(API_BASE + path, init);
  } catch {
    throw new ServiceError('Could not reach the server. Check your internet connection and try again.', 'NETWORK');
  }

  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = res.status === 401 ? 'UNAUTHORIZED' : data.code || `HTTP_${res.status}`;
    throw new ServiceError(data.message || 'Something went wrong, please try again', code, data);
  }
  return data;
}
