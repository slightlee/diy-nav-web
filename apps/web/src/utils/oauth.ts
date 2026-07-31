export type OAuthProvider = 'github' | 'google' | 'linuxdo'
export type OAuthMode = 'login' | 'bind'

const createRandomState = (): string => {
  const values = new Uint32Array(4)
  window.crypto.getRandomValues(values)
  return Array.from(values)
    .map(value => value.toString(16).padStart(8, '0'))
    .join('')
}

export const createOAuthLoginState = (): string => createRandomState()

const getAuthorizationUrl = (provider: OAuthProvider, state: string, mode: OAuthMode): string => {
  if (provider === 'linuxdo') {
    const clientId = import.meta.env.VITE_LINUX_DO_CLIENT_ID
    const redirectUri = import.meta.env.VITE_LINUX_DO_REDIRECT_URI
    if (!clientId || !redirectUri) throw new Error('LinuxDo 登录配置缺失')
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state
    })
    return `https://connect.linux.do/oauth2/authorize?${params.toString()}`
  }

  if (provider === 'github') {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    const redirectUri =
      import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/oauth2/callback`
    if (!clientId) throw new Error('GitHub 登录配置缺失')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) throw new Error('Google 登录配置缺失')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    ...(mode === 'bind' ? { prompt: 'select_account' } : {})
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export const startOAuth = (provider: OAuthProvider, state: string, mode: OAuthMode): void => {
  localStorage.setItem('oauth_state', state)
  localStorage.setItem('oauth_provider', provider)
  localStorage.setItem('oauth_mode', mode)
  window.location.assign(getAuthorizationUrl(provider, state, mode))
}
