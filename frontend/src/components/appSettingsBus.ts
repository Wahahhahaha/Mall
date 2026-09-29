import { BACKEND_URL } from '../config';

export interface AppSettingsState {
  appName: string;
  appLogo: string;
  favicon: string;
  brandMode: 'name' | 'logo';
  /** Mirrors `settings.systemAddress`; empty until the backend responds. */
  appAddress: string;
  ready: boolean;
}

type Listener = (state: AppSettingsState) => void;

let state: AppSettingsState = {
  appName: '',
  appLogo: '',
  favicon: '',
  brandMode: 'name',
  appAddress: '',
  ready: false,
};

const listeners = new Set<Listener>();

/**
 * Uploads are stored server-relative (`/uploads/...`). Resolve them here so every
 * consumer gets an absolute URL and the app does not depend on a dev-server proxy.
 */
export const assetUrl = (raw: string | null | undefined) => {
  const value = (raw ?? '').trim();
  if (!value) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `${BACKEND_URL}/${value.replace(/^\/+/, '')}`;
};

export function getAppSettings() {
  return state;
}

export function setAppSettings(patch: Partial<AppSettingsState>) {
  state = {
    ...state,
    ...patch,
    appLogo: assetUrl(patch.appLogo ?? state.appLogo),
    favicon: assetUrl(patch.favicon ?? state.favicon),
  };
  listeners.forEach((listener) => listener(state));
}

export function subscribeAppSettings(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
