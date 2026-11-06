import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { AVATARS } from '../src/progress/logic';

export interface Identity { id: string; username: string; avatar: string }

export const cleanName = (v: unknown): string => {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20) : '';
  return s || 'Player';
};
export const cleanAvatar = (v: unknown): string => (typeof v === 'string' && AVATARS.includes(v) ? v : AVATARS[0]);

export const newSecret = () => randomBytes(32).toString('hex');
export const newPlayerId = () => randomUUID();

const sign = (secret: string, id: string) => createHmac('sha256', secret).update(id).digest();

/** Token = player id + HMAC signature. Only the server knows the secret, so tokens cannot be forged. */
export const signToken = (secret: string, id: string) => `${id}.${sign(secret, id).toString('base64url')}`;

export function verifyToken(secret: string, token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const id = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1), 'base64url');
  const want = sign(secret, id);
  return given.length === want.length && timingSafeEqual(given, want) ? id : null;
}
