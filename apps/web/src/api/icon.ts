import { request } from '@/utils/http'
import type { GetIconResponse } from '@nav/icon-core'

export const getIcon = (params: { domain?: string; url?: string; refresh?: boolean }) => {
  const queryParams: Record<string, string | undefined> = {
    domain: params.domain,
    url: params.url,
    refresh: params.refresh ? 'true' : undefined
  }
  return request.get<GetIconResponse>('/api/icon', queryParams)
}
