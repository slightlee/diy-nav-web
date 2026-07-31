import type { DatabaseClient } from '@nav/database'

export interface EmailBindingChallenge {
  id: string
  user_id: string
  email: string
  token_hash: string
  expires_at: number
  created_at: number
  consumed_at: number | null
}

export class EmailBindingRepository {
  constructor(private readonly db: DatabaseClient) {}

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS email_binding_challenges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        consumed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)
    await this.db.execute(
      'CREATE INDEX IF NOT EXISTS idx_email_binding_challenges_user ON email_binding_challenges(user_id, created_at)'
    )
  }

  async replacePendingForUser(challenge: EmailBindingChallenge): Promise<void> {
    await this.db.batch([
      {
        sql: 'DELETE FROM email_binding_challenges WHERE user_id = ? AND consumed_at IS NULL',
        params: [challenge.user_id]
      },
      {
        sql: `INSERT INTO email_binding_challenges
              (id, user_id, email, token_hash, expires_at, created_at, consumed_at)
              VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        params: [
          challenge.id,
          challenge.user_id,
          challenge.email,
          challenge.token_hash,
          challenge.expires_at,
          challenge.created_at
        ]
      }
    ])
  }

  async findByTokenHash(tokenHash: string): Promise<EmailBindingChallenge | null> {
    return this.db.first<EmailBindingChallenge>(
      `SELECT id, user_id, email, token_hash, expires_at, created_at, consumed_at
       FROM email_binding_challenges WHERE token_hash = ?`,
      [tokenHash]
    )
  }

  async consume(id: string, consumedAt: number): Promise<void> {
    const result = await this.db.execute(
      `UPDATE email_binding_challenges SET consumed_at = ?
       WHERE id = ? AND consumed_at IS NULL`,
      [consumedAt, id]
    )
    if (result.changes === 0) {
      throw new Error('Email binding challenge was already consumed')
    }
  }

  async remove(id: string): Promise<void> {
    await this.db.execute('DELETE FROM email_binding_challenges WHERE id = ?', [id])
  }
}
