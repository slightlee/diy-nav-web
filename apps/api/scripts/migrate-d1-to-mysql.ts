/**
 * 一次性数据迁移脚本：Cloudflare D1 → MySQL
 *
 * 功能：
 *  1. 校验环境配置（DB_PROVIDER=mysql + D1 凭据）
 *  2. 在 MySQL 上创建全部业务表（复用应用自身的 initServices DDL，零漂移）
 *  3. 按"父表在前"的顺序把 D1 数据逐行 upsert 到 MySQL（可重复执行，幂等）
 *  4. 输出两侧行数对照表供人工核对
 *
 * 用法（在 apps/api 目录下，.env 需同时具备 D1 与 MySQL 配置）：
 *   DB_PROVIDER=mysql \
 *   DB_MYSQL_HOST=... DB_MYSQL_PORT=3306 DB_MYSQL_USER=... \
 *   DB_MYSQL_PASSWORD=... DB_MYSQL_DATABASE=... \
 *   pnpm tsx scripts/migrate-d1-to-mysql.ts
 *
 * 注意：
 *  - 备份/同步快照的文件本体存放在对象存储（R2/S3/WebDAV），不在数据库里，
 *    迁移后 MySQL 的存储配置表继续指向同一存储即可访问。
 *  - 回滚：把 DB_PROVIDER 改回 d1 并重启即可，D1 数据在迁移过程中只读不写。
 */
import { createDatabaseClient, type DatabaseClient } from '@nav/database'
import { logger as defaultLogger } from '@nav/logger'
import { loadRawConfig } from '@nav/config'
import { initServices, databaseClient } from '../src/services.js'
import { OAuthProviderConfigService } from '../src/lib/oauth-provider-config.js'

/** 外键父表（users）必须最先迁移 */
const MIGRATION_ORDER = [
  'users',
  'user_identities',
  'user_preferences',
  'email_binding_challenges',
  'user_sync_state',
  'data_backups',
  'ai_providers',
  'site_settings',
  'oauth_provider_configs',
  'storage_purpose_configs'
] as const

const safeIdentifier = (value: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`非法标识符: ${value}`)
  }
  return value
}

async function main(): Promise<void> {
  const raw = loadRawConfig()

  if (raw.DB_PROVIDER !== 'mysql') {
    throw new Error('请设置 DB_PROVIDER=mysql，避免误把 MySQL 数据写进 D1')
  }
  for (const key of ['DB_MYSQL_HOST', 'DB_MYSQL_USER', 'DB_MYSQL_DATABASE'] as const) {
    if (!raw[key]) throw new Error(`缺少 MySQL 配置: ${key}`)
  }
  if (!raw.DB_D1_DATABASE_ID || !raw.DB_D1_API_TOKEN || !raw.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('缺少 D1 凭据: CLOUDFLARE_ACCOUNT_ID / DB_D1_API_TOKEN / DB_D1_DATABASE_ID')
  }

  const d1: DatabaseClient = createDatabaseClient({
    provider: 'd1',
    config: {
      accountId: raw.CLOUDFLARE_ACCOUNT_ID,
      databaseId: raw.DB_D1_DATABASE_ID,
      apiToken: raw.DB_D1_API_TOKEN
    }
  })

  // 1. 复用应用自身的建表逻辑，保证结构与运行时完全一致
  //    （initServices 覆盖 9 张业务表；oauth 表由 server.ts 启动时单独建，这里保持一致）
  defaultLogger.info('正在 MySQL 上创建业务表（幂等）…')
  await initServices(defaultLogger)
  const { httpClient } = await import('../src/lib/http.js')
  const oauthService = new OAuthProviderConfigService(
    databaseClient,
    httpClient,
    raw.OAUTH_CONFIG_ENCRYPTION_KEY || ''
  )
  await oauthService.initTable()

  const mysql: DatabaseClient = createDatabaseClient({
    provider: 'mysql',
    config: {
      host: raw.DB_MYSQL_HOST as string,
      port: raw.DB_MYSQL_PORT,
      user: raw.DB_MYSQL_USER as string,
      password: raw.DB_MYSQL_PASSWORD,
      database: raw.DB_MYSQL_DATABASE as string,
      connectionLimit: raw.DB_MYSQL_CONNECTION_LIMIT
    }
  })

  // 2. 逐表迁移（upsert，幂等可重跑）
  const summary: { table: string; d1: number; mysql: number }[] = []
  for (const table of MIGRATION_ORDER) {
    const safeTable = safeIdentifier(table)
    const rows = await d1.all<Record<string, unknown>>(`SELECT * FROM ${safeTable}`)

    for (const row of rows) {
      const columns = Object.keys(row)
      if (columns.length === 0) continue
      columns.forEach(safeIdentifier)
      const columnSql = columns.map(name => `\`${name}\``).join(', ')
      const placeholderSql = columns.map(() => '?').join(', ')
      const updateSql = columns.map(name => `\`${name}\` = VALUES(\`${name}\`)`).join(', ')

      await mysql.execute(
        `INSERT INTO \`${safeTable}\` (${columnSql})
         VALUES (${placeholderSql})
         ON DUPLICATE KEY UPDATE ${updateSql}`,
        columns.map(name => row[name] ?? null)
      )
    }

    const countRow = await mysql.first<{ c: number }>(`SELECT COUNT(*) AS c FROM \`${safeTable}\``)
    summary.push({ table: safeTable, d1: rows.length, mysql: countRow?.c ?? 0 })
    defaultLogger.info({ table: safeTable, migrated: rows.length }, '表迁移完成')
  }

  // 3. 行数对照
  console.log('\n===== 迁移完成，行数对照 =====')
  console.table(summary)
  const mismatch = summary.filter(row => row.d1 !== row.mysql)
  if (mismatch.length > 0) {
    throw new Error(`以下表行数不一致，请检查: ${mismatch.map(row => row.table).join(', ')}`)
  }
  console.log('全部表行数一致，迁移成功。')
  // mysql2 连接池会保持事件循环存活，显式退出供 CI/脚本调用方拿到结束信号
  process.exit(0)
}

main().catch(error => {
  defaultLogger.error({ err: error }, 'D1 → MySQL 迁移失败')
  process.exit(1)
})
