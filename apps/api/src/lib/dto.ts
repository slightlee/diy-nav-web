import { User } from '@nav/core'

/**
 * Interface representing the safe public view of a user
 */
export interface UserDTO {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
  created_at?: number
}

/**
 * Transforms a User entity into a safe DTO (Data Transfer Object)
 * Removes sensitive fields like password_hash
 */
export function toUserDto(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    role: user.role,
    created_at: user.created_at
  }
}
