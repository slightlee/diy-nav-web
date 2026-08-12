import { request } from '@/utils/http'

export type OAuthProvider = 'github' | 'google' | 'linuxdo'
export type OAuthMode = 'login' | 'bind'

export interface OAuthProviderConfig {
  provider: OAuthProvider
  clientId: string
  redirectUri: string
}

let oauthProviderConfigsPromise: Promise<OAuthProviderConfig[]> | null = null

const createRandomState = (): string => {
  const values = new Uint32Array(4)
  window.crypto.getRandomValues(values)
  return Array.from(values)
    .map(value => value.toString(16).padStart(8, '0'))
    .join('')
}

export const createOAuthLoginState = (): string => createRandomState()

export const fetchOAuthProviderConfigs = (): Promise<OAuthProviderConfig[]> => {
  if (!oauthProviderConfigsPromise) {
    oauthProviderConfigsPromise = request
      .get<OAuthProviderConfig[]>('/api/auth/oauth-providers')
      .then(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || '第三方登录配置读取失败')
        }
        return response.data
      })
      .catch(error => {
        oauthProviderConfigsPromise = null
        throw error
      })
  }
  return oauthProviderConfigsPromise
}

const getAuthorizationUrl = (
  config: OAuthProviderConfig,
  state: string,
  mode: OAuthMode
): string => {
  const { provider, clientId, redirectUri } = config
  if (provider === 'linuxdo') {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state
    })
    return `https://connect.linux.do/oauth2/authorize?${params.toString()}`
  }

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
      // GitHub may reuse a previous OAuth grant without showing any page. Binding must still
      // let the user explicitly choose which GitHub account is linked to the current account.
      ...(mode === 'bind' ? { prompt: 'select_account' } : {})
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Binding must let Google disclose the requested identity scopes before the
    // user confirms, even when this OAuth client was previously authorized.
    ...(mode === 'bind' ? { prompt: 'consent select_account' } : {})
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export const startOAuth = async (
  provider: OAuthProvider,
  state: string,
  mode: OAuthMode,
  brandIcon?: string
): Promise<void> => {
  const configs = await fetchOAuthProviderConfigs()
  const config = configs.find(item => item.provider === provider)
  if (!config) throw new Error(`${provider} 登录暂未配置`)

  localStorage.setItem('oauth_state', state)
  localStorage.setItem('oauth_provider', provider)
  localStorage.setItem('oauth_mode', mode)
  const normalizedBrandIcon = brandIcon?.trim()
  if (normalizedBrandIcon) localStorage.setItem('oauth_brand_icon', normalizedBrandIcon)
  else localStorage.removeItem('oauth_brand_icon')
  window.location.assign(getAuthorizationUrl(config, state, mode))
}
