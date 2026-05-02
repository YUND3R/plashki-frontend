import { apiFetch } from './client'

export function healthCheck() {
  return apiFetch<{ status?: string; database?: string }>('/health')
}