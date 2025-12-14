import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { IOAuthProvider } from './types.js'

export class AuthProviderFactory {
  private providers: Map<string, IOAuthProvider> = new Map()

  register(provider: IOAuthProvider) {
    this.providers.set(provider.name, provider)
  }

  getProvider(name: string): IOAuthProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`OAuth Provider [${name}] not supported`)
    }
    return provider
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authProviderFactory: AuthProviderFactory
  }
}

// NOTE: The plugin now only creates the factory. Registration of providers happens in the app!
// This is TRUE dependency injection. The factory shouldn't know about LinuxDoProvider by default.
const authProviderPlugin: FastifyPluginAsync = async app => {
  const factory = new AuthProviderFactory()
  app.decorate('authProviderFactory', factory)
}

export default fp(authProviderPlugin)
