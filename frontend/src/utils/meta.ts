export interface ActionMeta {
  userid?: number;
  email?: string;
  ip?: string;
  latitude?: number;
  longitude?: number;
}

let cachedIp: string | null | undefined;
let cachedGeo: { latitude: number; longitude: number } | null | undefined;

function currentUser(): { userid?: number; email?: string } {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    const u = JSON.parse(raw);
    return {
      userid: typeof u?.userid === 'number' ? u.userid : undefined,
      email: u?.email || undefined,
    };
  } catch {
    return {};
  }
}

async function fetchIp(): Promise<string | undefined> {
  if (cachedIp !== undefined) return cachedIp || undefined;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    cachedIp = data?.ip || null;
  } catch {
    cachedIp = null;
  }
  return cachedIp || undefined;
}

function fetchGeo(): Promise<{ latitude: number; longitude: number } | null> {
  if (cachedGeo !== undefined) return Promise.resolve(cachedGeo);
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      cachedGeo = null;
      return resolve(null);
    }
    const timer = setTimeout(() => {
      cachedGeo = null;
      resolve(null);
    }, 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        cachedGeo = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        resolve(cachedGeo);
      },
      () => {
        clearTimeout(timer);
        cachedGeo = null;
        resolve(null);
      },
      { timeout: 3500 },
    );
  });
}

export async function buildMeta(): Promise<ActionMeta> {
  const [ip, geo] = await Promise.all([fetchIp(), fetchGeo()]);
  const { userid, email } = currentUser();
  return {
    userid,
    email,
    ip,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
  };
}
