import { AxiosInstance } from 'axios'
import { IOAuthProvider, OAuthToken, OAuthUser, AuthProviderConfig } from '../types.js'

export class LinuxDoProvider implements IOAuthProvider {
  public readonly name = 'linuxdo'

  // https://connect.linuxdo.org/
  // private static readonly TOKEN_URL = 'https://connect.linux.do/oauth2/token'
  // private static readonly USER_INFO_URL = 'https://connect.linux.do/api/user'

  private static readonly TOKEN_URL = 'https://connect.linuxdo.org/oauth2/token'
  private static readonly USER_INFO_URL = 'https://connect.linuxdo.org/api/user'

  constructor(
    private readonly config: AuthProviderConfig,
    private readonly httpClient: AxiosInstance
  ) {}

  async exchangeToken(code: string): Promise<OAuthToken> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new Error('Linux.do configuration missing')
    }

    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    )

    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', this.config.redirectUri)

    const response = await this.httpClient.post(LinuxDoProvider.TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`
      }
    })

    return response.data
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await this.httpClient.get(LinuxDoProvider.USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    const data = response.data

    return {
      id: String(data.sub || data.id),
      email: data.email,
      name: data.name || data.nickname || data.preferred_username,
      avatar_url: data.picture || data.avatar_url,
      raw: data
    }
  }
}
