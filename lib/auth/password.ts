/**
 * lib/auth/password.ts
 *
 * Password hashing and verification using Argon2id (@node-rs/argon2)
 * MemoryCost: 19456 (19 MB), TimeCost: 2, Parallelism: 1 (§14.1.2)
 */

import { hash, verify } from '@node-rs/argon2'

export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })
}

export async function verifyPassword(plainText: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plainText)
  } catch (err) {
    return false
  }
}
