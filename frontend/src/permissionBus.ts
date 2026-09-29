import { useSyncExternalStore } from 'react';
import axios from 'axios';
import { BACKEND_URL } from './config';
import { PERMISSION_PAGES, isGrantedByDefault } from './permissionPages';

interface PermissionRow {
  levelid: number;
  page: string;
  action: string;
  granted: boolean;
}

export interface PermissionsSnapshot {
  ready: boolean;
  /** True when the current session has no level (e.g. legacy login) → never hide menus. */
  unrestricted: boolean;
  granted: Record<string, boolean>;
  can: (page: string, action?: string) => boolean;
}

type Listener = () => void;

let granted: Record<string, boolean> = {};
let ready = false;
let unrestricted = false;

const listeners = new Set<Listener>();
let snapshot: PermissionsSnapshot | null = null;

const keyOf = (page: string, action: string) => `${page}.${action}`;

export function canAccess(page: string, action = 'view'): boolean {
  if (unrestricted) return true;
  const def = PERMISSION_PAGES.find((p) => p.key === page);
  if (!def || !def.actions.some((a) => a.key === action)) return true;
  const key = keyOf(page, action);
  return key in granted ? granted[key] : isGrantedByDefault(action);
}

function buildSnapshot(): PermissionsSnapshot {
  if (!snapshot) {
    snapshot = { ready, unrestricted, granted, can: canAccess };
  } else {
    snapshot.ready = ready;
    snapshot.unrestricted = unrestricted;
    snapshot.granted = granted;
  }
  return snapshot;
}

export function getPermissionsSnapshot(): PermissionsSnapshot {
  return buildSnapshot();
}

export function subscribePermissions(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePermissions(): PermissionsSnapshot {
  return useSyncExternalStore(subscribePermissions, getPermissionsSnapshot);
}

function emit() {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

/** Loads the permissions of the current signed-in user from the backend. */
export async function loadPermissions(): Promise<void> {
  const raw = localStorage.getItem('user');
  let levelid: number | undefined;
  if (raw) {
    try {
      levelid = (JSON.parse(raw) as { levelid?: number }).levelid;
    } catch {
      levelid = undefined;
    }
  }

  const isAuthed = !!localStorage.getItem('token');
  if (!isAuthed || levelid === undefined) {
    unrestricted = true;
    granted = {};
    ready = true;
    emit();
    return;
  }

  try {
    const res = await axios.get<PermissionRow[]>(`${BACKEND_URL}/permissions`);
    const next: Record<string, boolean> = {};
    for (const perm of res.data) {
      if (perm.levelid === levelid) next[keyOf(perm.page, perm.action)] = perm.granted;
    }
    granted = next;
    unrestricted = false;
  } catch {
    // Keep whatever was loaded before so a transient failure never hides menus.
  }
  ready = true;
  emit();
}