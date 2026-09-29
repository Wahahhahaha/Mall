import { useEffect, useRef, useState } from 'react';
import { RECAPTCHA_SITE_KEY } from '../config';

interface GReCaptcha {
  render: (el: HTMLElement, opts: Record<string, unknown>) => number;
  reset: (id: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: GReCaptcha;
  }
}

let recaptchaPromise: Promise<GReCaptcha> | null = null;

function getReCaptcha(): Promise<GReCaptcha> {
  if (recaptchaPromise) return recaptchaPromise;
  recaptchaPromise = new Promise<GReCaptcha>((resolve) => {
    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      resolve(window.grecaptcha);
      return;
    }
    (window as unknown as { recaptchaCallback?: () => void }).recaptchaCallback = () => {
      if (window.grecaptcha) resolve(window.grecaptcha);
    };
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaCallback&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
  return recaptchaPromise;
}

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpired?: () => void;
  resetKey?: number;
}

export default function ReCaptcha({ onVerify, onExpired, resetKey = 0 }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReCaptcha().then((grecaptcha) => {
      if (cancelled || !containerRef.current) return;
      const id = grecaptcha.render(containerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onExpired?.(),
        'error-callback': () => onExpired?.(),
      });
      setWidgetId(id);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetKey > 0 && widgetId != null) {
      getReCaptcha().then((grecaptcha) => grecaptcha.reset(widgetId));
    }
  }, [resetKey, widgetId]);

  return <div className="recaptcha-wrap" ref={containerRef} />;
}
