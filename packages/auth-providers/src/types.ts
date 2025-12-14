export interface OAuthToken {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface OAuthUser {
  id: string
  email?: string
  name?: string
  avatar_url?: string
  raw: Record<string, unknown>
}

export interface IOAuthProvider {
  name: string
  exchangeToken(code: string): Promise<OAuthToken>
  getUserInfo(token: string): Promise<OAuthUser>
}

export interface AuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}
