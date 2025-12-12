import pino, { type LoggerOptions } from 'pino'

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

// Safely get env vars
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  // Fallback for Vite/modern browser envs if they replace process.env.NODE_ENV string literal
  // but don't provided the process object.
  // Note: Bundlers often replace `process.env.NODE_ENV` with a string literal at compile time.
  // We handle that specific case via try-catch or direct check if needed, but usually explicit check is best.
  try {
    // This is a direct check that bundlers like Vite/Webpack often replace
    if (key === 'NODE_ENV') return process.env.NODE_ENV
    if (key === 'LOG_LEVEL') return process.env.LOG_LEVEL
    if (key === 'LOG_HEADERS') return process.env.LOG_HEADERS
  } catch {
    // Ignore ReferenceError
  }
  return undefined
}

const safeNodeEnv = getEnv('NODE_ENV')
const safeLogLevel = getEnv('LOG_LEVEL')

const isDev = safeNodeEnv === 'development' || safeNodeEnv === 'test'
const logLevel = safeLogLevel || (isDev ? 'debug' : 'info')

// Common configuration for data redaction
const redactOptions = {
  paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret'],
  censor: '***'
}

const browserConfig: LoggerOptions = {
  browser: {
    asObject: true
  },
  level: logLevel,
  redact: redactOptions
}

const safeLogHeaders = getEnv('LOG_HEADERS') === 'true'

// If headers are not enabled, we add them to the redaction list to mask them entirely
if (!safeLogHeaders) {
  redactOptions.paths.push('req.headers', 'res.headers')
  // Automatically redact headers if the user hasn't explicitly enabled them for debugging.
  // This ensures a clean log output and prevents accidental leakage of sensitive tokens.
}

const nodeConfig: LoggerOptions = {
  level: logLevel,
  redact: redactOptions,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      }
    : {
        // Production optimization: use ISO time and uppercase levels if needed, or stick to defaults.
        timestamp: pino.stdTimeFunctions.isoTime
      })
}

export const configs = {
  browser: browserConfig,
  node: nodeConfig
}

export const createLogger = (options: LoggerOptions = {}) => {
  const config = isBrowser ? browserConfig : nodeConfig
  return pino({ ...config, ...options })
}

export const logger = createLogger()

export type { Logger } from 'pino'
