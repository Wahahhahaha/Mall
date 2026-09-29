export const BACKEND_URL = 'http://localhost:3000';

// Google reCAPTCHA v2 (checkbox) — reads from VITE_RECAPTCHA_SITE_KEY in frontend/.env
// Keep this in sync with RECAPTCHA_SITE_KEY used by the backend (.env)
export const RECAPTCHA_SITE_KEY: string =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

// Google Sign-In (OAuth) — client id of a Google OAuth web app
// Leave empty to skip Google sign-in on the login page
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
