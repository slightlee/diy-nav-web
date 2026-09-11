import type { DatabaseClient } from './types.js'

/** 防御性标识符校验：辅助函数拼接的表名/索引名/列名必须是合法标识符。 */
function assertIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid database ${label}: ${value}`)
  }
}

/**
 * 读取表的列名集合（方言感知）。
 * 替代各处直接写 SQLite 方言的 `PRAGMA table_info`。
 */
export async function getTableColumns(db: DatabaseClient, table: string): Promise<Set<string>> {
  assertIdentifier(table, 'table name')

  if (db.dialect === 'mysql') {
    const rows = await db.all<{ name: string }>(
      `SELECT COLUMN_NAME AS name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [table]
    )
    return new Set(rows.map(row => row.name))
  }

  const rows = await db.all<{ name: string }>(`PRAGMA table_info(${table})`)
  return new Set(rows.map(row => row.name))
}

/**
 * 确保索引存在（方言感知）。
 * MySQL 不支持 `CREATE INDEX IF NOT EXISTS`，改为查询 information_schema 后按需创建。
 */
export async function ensureIndex(
  db: DatabaseClient,
  indexName: string,
  table: string,
  columns: string[],
  options: { unique?: boolean } = {}
): Promise<void> {
  assertIdentifier(indexName, 'index name')
  assertIdentifier(table, 'table name')
  columns.forEach(column => assertIdentifier(column, 'column name'))

  const columnList = columns.join(', ')
  const uniquePrefix = options.unique ? 'UNIQUE INDEX' : 'INDEX'

  if (db.dialect === 'mysql') {
    const rows = await db.all<{ count: number }>(
      `SELECT COUNT(*) AS count FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, indexName]
    )
    if ((rows[0]?.count ?? 0) > 0) return
    await db.execute(`CREATE ${uniquePrefix} ${indexName} ON ${table} (${columnList})`)
    return
  }

  await db.execute(
    `CREATE ${options.unique ? 'UNIQUE INDEX' : 'INDEX'} IF NOT EXISTS ${indexName} ON ${table} (${columnList})`
  )
}
