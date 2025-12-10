import pino, { Logger } from 'pino'
export type { Logger }

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

export const logger = pino({
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
})
