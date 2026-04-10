/**
 * Static Password Auth (Offline / Local)
 *
 * Single source of truth for:
 * - Login password
 * - Manager password (edit/delete authorization)
 * - Guest mode login
 * - Logout (clears local storage)
 *
 * NOTE: This is not secure and is intended for demo/offline usage.
 * For production, replace with real authentication.
 */

import { STORAGE_KEYS } from './constants';

export type StaticUserRole = 'owner' | 'guest';

export type StaticUser = {
  id: string;
  name: string;
  role: StaticUserRole;
};

export const STATIC_PASSWORDS = {
  LOGIN: '123456',
  MANAGER: '123456',
} as const;

export function formatLoginSuccessMessage(userName: string): string {
  return `${userName} Login successfully`;
}

export function validateLoginPassword(password: string): boolean {
  return password === STATIC_PASSWORDS.LOGIN;
}

export function validateManagerPassword(password: string): boolean {
  return password === STATIC_PASSWORDS.MANAGER;
}

export function loginAsOwner(): StaticUser {
  if (typeof window === 'undefined') return { id: 'local', name: 'Owner', role: 'owner' };
  const user: StaticUser = { id: 'local', name: 'Owner', role: 'owner' };
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'local');
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
}

export function loginAsGuest(): StaticUser {
  if (typeof window === 'undefined') return { id: 'guest', name: 'Guest', role: 'guest' };
  const user: StaticUser = { id: 'guest', name: 'Guest', role: 'guest' };
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'guest');
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
}

export function logoutAndClearAllStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.clear();
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function getStoredUser(): StaticUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      id: String(parsed.id ?? ''),
      name: String(parsed.name ?? 'User'),
      role: (parsed.role === 'guest' ? 'guest' : 'owner') as StaticUserRole,
    };
  } catch {
    return null;
  }
}

export function getUserDisplayName(): string {
  return getStoredUser()?.name || 'User';
}
