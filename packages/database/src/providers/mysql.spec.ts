import { beforeEach, describe, expect, it, vi } from 'vitest'

// 稳定单例 mock：客户端构造时 createPool 返回的必须是测试断言的同一个对象
const mocks = vi.hoisted(() => {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn()
  }
  const pool = {
    query: vi.fn(),
    getConnection: vi.fn(async () => connection)
  }
  return { connection, pool }
})

vi.mock('mysql2/promise', () => ({
  createPool: vi.fn(() => mocks.pool)
}))

import { MysqlClient, type MysqlClientConfig } from './mysql.js'

const config: MysqlClientConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'nav',
  password: 'secret',
  database: 'diy_nav',
  connectionLimit: 5
}

describe('MysqlClient', () => {
  let client: MysqlClient

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pool.getConnection.mockImplementation(async () => mocks.connection)
    client = new MysqlClient(config)
  })

  it('exposes the mysql dialect', () => {
    expect(client.dialect).toBe('mysql')
  })

  it('maps execute results to changes/lastInsertRowid', async () => {
    mocks.pool.query.mockResolvedValueOnce([{ affectedRows: 2, insertId: 7 }, []])

    const result = await client.execute('INSERT INTO t (a) VALUES (?)', ['x'])

    expect(mocks.pool.query).toHaveBeenCalledWith('INSERT INTO t (a) VALUES (?)', ['x'])
    expect(result).toEqual({ changes: 2, lastInsertRowid: 7 })
  })

  it('returns first row or null', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{ id: 'a' }, { id: 'b' }], []])
    await expect(client.first('SELECT * FROM t')).resolves.toEqual({ id: 'a' })

    mocks.pool.query.mockResolvedValueOnce([[], []])
    await expect(client.first('SELECT * FROM t')).resolves.toBeNull()
  })

  it('always resolves all() to an array', async () => {
    mocks.pool.query.mockResolvedValueOnce([[{ id: 'a' }], []])
    await expect(client.all('SELECT * FROM t')).resolves.toEqual([{ id: 'a' }])

    mocks.pool.query.mockResolvedValueOnce([{ some: 'non-array' }, []])
    await expect(client.all('SHOW TABLES')).resolves.toEqual([])
  })

  describe('batch', () => {
    it('runs all statements inside one transaction and commits', async () => {
      const conn = mocks.connection
      conn.query.mockResolvedValue([{ affectedRows: 1 }, []])

      const results = await client.batch([
        { sql: 'DELETE FROM a WHERE id = ?', params: ['x'] },
        { sql: 'INSERT INTO b (id) VALUES (?)', params: ['y'] }
      ])

      expect(conn.beginTransaction).toHaveBeenCalledTimes(1)
      expect(conn.query).toHaveBeenCalledTimes(2)
      expect(conn.commit).toHaveBeenCalledTimes(1)
      expect(conn.rollback).not.toHaveBeenCalled()
      expect(conn.release).toHaveBeenCalledTimes(1)
      expect(results).toEqual([
        { changes: 1, lastInsertRowid: undefined },
        { changes: 1, lastInsertRowid: undefined }
      ])
    })

    it('rolls back and rethrows when a statement fails', async () => {
      const conn = mocks.connection
      conn.query.mockRejectedValueOnce(new Error('constraint failed'))

      await expect(client.batch([{ sql: 'INSERT INTO a VALUES (1)' }])).rejects.toThrow(
        'constraint failed'
      )

      expect(conn.rollback).toHaveBeenCalledTimes(1)
      expect(conn.commit).not.toHaveBeenCalled()
      expect(conn.release).toHaveBeenCalledTimes(1)
    })

    it('short-circuits empty batches without touching a connection', async () => {
      await expect(client.batch([])).resolves.toEqual([])
      expect(mocks.pool.getConnection).not.toHaveBeenCalled()
    })
  })
})
