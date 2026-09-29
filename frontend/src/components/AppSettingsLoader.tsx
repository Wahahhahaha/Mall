import { useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { assetUrl, setAppSettings, subscribeAppSettings } from './appSettingsBus';

const FAVICON_ID = 'dynamic-favicon';

const BLANK_FAVICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

function faviconType(url: string): string {
  const ext = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[ext] ?? 'image/png';
}

function applyFaviconToDom(rawUrl: string) {
  let link = document.getElementById(FAVICON_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FAVICON_ID;
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  if (!rawUrl) {
    // Clearing the favicon must also clear the tab icon, not leave the old one behind.
    link.type = 'image/png';
    link.href = BLANK_FAVICON;
    return;
  }

  // The stored path is stable per upload, but a stale HTTP cache entry would keep
  // showing the previous icon, so every change gets a fresh cache key.
  const url = `${assetUrl(rawUrl)}${rawUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
  link.type = faviconType(url);
  link.href = url;
}

function AppSettingsLoader() {
  useEffect(() => {
    let ignore = false;
    axios
      .get<{
        systemName: string;
        systemLogo: string | null;
        systemFavicon: string | null;
        logoMode: boolean;
        systemAddress: string | null;
      }>(`${BACKEND_URL}/settings`)
      .then((res) => {
        if (ignore) return;
        const d = res.data;
        setAppSettings({
          appName: d.systemName || 'SIM MALL',
          appLogo: d.systemLogo ?? '',
          favicon: d.systemFavicon ?? '',
          brandMode: d.logoMode ? 'logo' : 'name',
          appAddress: d.systemAddress ?? '',
          ready: true,
        });
      })
      .catch(() => {
        if (ignore) return;
        setAppSettings({ ready: true });
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(
    () =>
      subscribeAppSettings((s) => {
        applyFaviconToDom(s.favicon);
        if (s.appName) document.title = s.appName;
      }),
    []
  );

  return null;
}

export default AppSettingsLoader;
