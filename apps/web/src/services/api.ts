/// <reference types="vite/client" />

const API_BASE = (import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3000` : window.location.origin))
  .replace(/\/+$/, '');

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export const apiFetch = (path: string, init?: RequestInit) => fetch(apiUrl(path), init);
