import { apiFetchJson } from './client'

export type FeedbackCategory = 'bug' | 'idea' | 'other'

export type FeedbackPayload = {
  category: FeedbackCategory
  message: string
  page_url: string
  contact_email?: string
}

export type FeedbackResponse = {
  id: string
  created_at: string
  detail: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const body: Record<string, string> = {
    category: payload.category,
    message: payload.message,
    page_url: payload.page_url,
  }
  const email = payload.contact_email?.trim()
  if (email) body.contact_email = email
  return apiFetchJson<FeedbackResponse>('/feedback', body)
}
