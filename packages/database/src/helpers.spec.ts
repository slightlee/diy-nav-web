import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient, DatabaseDialect } from './types.js'
import { ensureIndex, getTableColumns } from './helpers.js'

function makeDb(dialect: DatabaseDialect): DatabaseClient & { all: ReturnType<typeof vi.fn> } {
  const all = vi.fn().mockResolvedValue([])
  return {
    dialect,
    all,
    first: vi.fn(),
    execute: vi.fn().mockResolvedValue({}),
    batch: vi.fn()
  }
}

describe('getTableColumns', () => {
  it('uses PRAGMA on sqlite and returns the column name set', async () => {
    const db = makeDb('sqlite')
    db.all.mockResolvedValue([{ name: 'id' }, { name: 'email' }])

    await expect(getTableColumns(db, 'users')).resolves.toEqual(new Set(['id', 'email']))
    expect(db.all).toHaveBeenCalledWith('PRAGMA table_info(users)')
  })

  it('queries information_schema on mysql', async () => {
    const db = makeDb('mysql')
    db.all.mockResolvedValue([{ name: 'id' }])

    await getTableColumns(db, 'users')

    const [sql, params] = db.all.mock.calls[0]
    expect(sql).toContain('information_schema.columns')
    expect(params).toEqual(['users'])
  })

  it('rejects invalid table identifiers', async () => {
    const db = makeDb('sqlite')
    await expect(getTableColumns(db, 'users; DROP TABLE users')).rejects.toThrow(
      'Invalid database table name'
    )
  })
})

describe('ensureIndex', () => {
  it('creates with IF NOT EXISTS on sqlite', async () => {
    const db = makeDb('sqlite')
    await ensureIndex(db, 'idx_a', 't', ['user_id', 'created_at'], { unique: true })

    expect(db.execute).toHaveBeenCalledWith(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_a ON t (user_id, created_at)'
    )
  })

  it('checks information_schema first and skips existing indexes on mysql', async () => {
    const db = makeDb('mysql')
    db.all.mockResolvedValue([{ count: 1 }])

    await ensureIndex(db, 'idx_a', 't', ['user_id'])

    expect(db.execute).not.toHaveBeenCalled()
  })

  it('creates the index on mysql when missing', async () => {
    const db = makeDb('mysql')
    db.all.mockResolvedValue([{ count: 0 }])

    await ensureIndex(db, 'idx_a', 't', ['user_id'])

    expect(db.execute).toHaveBeenCalledWith('CREATE INDEX idx_a ON t (user_id)')
  })
})
