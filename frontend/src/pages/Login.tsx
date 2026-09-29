import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSyncExternalStore } from 'react';
import { getAppSettings, subscribeAppSettings } from '../components/appSettingsBus';
import axios from 'axios';
import {
  Building2,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { BACKEND_URL, GOOGLE_CLIENT_ID } from '../config';
import ReCaptcha from '../components/ReCaptcha';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            ux_mode?: string;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type LoginStep = 'methods' | 'email' | 'otp';

interface AuthResponse {
  access_token: string;
  user: { userid: number; email: string; level: string; phone: string | null };
}

let gsiPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('GSI load failed'));
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function Login() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login'
  );
  const [, setSearchParams] = useSearchParams();

  // Register has no route of its own — it is a mode on this page — so the mode
  // is mirrored into the query string. That keeps the panel linkable and
  // shareable, and a reload of the shared URL lands on Register.
  const goMode = useCallback((next: 'login' | 'register') => {
    setMode(next);
    setSearchParams(next === 'register' ? { mode: 'register' } : {}, { replace: true });
  }, [setSearchParams]);

  const [loginStep, setLoginStep] = useState<LoginStep>('methods');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regCaptchaToken, setRegCaptchaToken] = useState('');
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

  const applyAuth = useCallback(
    (data: AuthResponse) => {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const lvl = (data.user.level as string).toLowerCase();
      if (lvl === 'parkir') navigate('/parkir');
      else if (lvl === 'tenant') navigate('/tenant');
      else navigate('/dashboard');
    },
    [navigate],
  );

  const errMsg = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      return err.response.data.message;
    }
    return fallback;
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setLoginError(null);
    setLoginSuccess(null);
    if (!GOOGLE_CLIENT_ID) {
      setGoogleLoading(false);
      setLoginError('Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable it.');
      return;
    }
    try {
      await loadGsiScript();
      const g = window.google;
      if (!g) throw new Error('GSI unavailable');
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        callback: async (resp) => {
          try {
            const { data } = await axios.post(`${BACKEND_URL}/auth/google`, {
              credential: resp.credential,
            });
            setGoogleLoading(false);
            setLoginSuccess('Google sign-in successful!');
            setTimeout(() => applyAuth(data), 500);
          } catch (err) {
            console.error(err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
              const message =
                err.response?.data?.message ||
                'This Google account is not registered on this workspace.';
              setLoginError(String(message));
            } else {
              setLoginError(errMsg(err, 'Google sign-in failed.'));
            }
            setGoogleLoading(false);
          }
        },
      });
      g.accounts.id.prompt();
    } catch (err) {
      console.error(err);
      setGoogleLoading(false);
      setLoginError('Failed to load Google Sign-In. Please try again.');
    }
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const demoAccounts = [
    { email: 'superadmin@mall.com', password: 'superadmin', role: 'Superadmin' },
    { email: 'admin@mall.com', password: 'admin', role: 'Admin' },
    { email: 'parkir@mall.com', password: 'parkir', role: 'Parkir' },
    { email: 'manager@mall.com', password: 'manager', role: 'Manager' },
    { email: 'tenant@mall.com', password: 'tenant', role: 'Tenant' },
  ];

  const handleQuickFill = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setLoginError(null);
    setLoginSuccess(null);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLoginError('Please fill in your email and password.');
      return;
    }
    setPassLoading(true);
    setLoginError(null);
    setLoginSuccess(null);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: email.trim(),
        password,
      });
      setLoginSuccess('Login successful!');
      setTimeout(() => applyAuth(data), 500);
    } catch (err) {
      console.error(err);
      setLoginError(errMsg(err, 'Invalid email or password.'));
    } finally {
      setPassLoading(false);
    }
  };

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) {
      setLoginError('Please enter your email.');
      return;
    }
    setEmailLoading(true);
    setLoginError(null);
    setOtpSentMsg(null);
    setDevOtp(null);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/auth/otp/request`, {
        email: otpEmail,
      });
      setOtpSentMsg(data.message as string);
      if (data.devOtp) setDevOtp(data.devOtp as string);
      setOtpCode('');
      setResendIn(Number(data.expiresInSeconds) || 300);
      setLoginStep('otp');
    } catch (err) {
      console.error(err);
      setLoginError(errMsg(err, 'Could not send the sign-in code.'));
    } finally {
      setEmailLoading(false);
    }
  };

  const resendCode = async () => {
    setEmailLoading(true);
    setLoginError(null);
    setOtpSentMsg(null);
    setDevOtp(null);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/auth/otp/request`, {
        email: otpEmail,
      });
      setOtpSentMsg(data.message as string);
      if (data.devOtp) setDevOtp(data.devOtp as string);
      setOtpCode('');
      setResendIn(Number(data.expiresInSeconds) || 300);
    } catch (err) {
      console.error(err);
      setLoginError(errMsg(err, 'Could not resend the sign-in code.'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setLoginError('Please enter the code.');
      return;
    }
    setOtpLoading(true);
    setLoginError(null);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/auth/otp/verify`, {
        email: otpEmail,
        otp: otpCode.trim(),
      });
      setLoginSuccess('Sign-in successful!');
      setTimeout(() => applyAuth(data), 500);
    } catch (err) {
      console.error(err);
      setLoginError(errMsg(err, 'Verification failed.'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      setRegError('Please fill in all fields.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!regCaptchaToken) {
      setRegError('Please complete the reCAPTCHA verification.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/auth/register`, {
        email: regEmail,
        password: regPassword,
        recaptchaToken: regCaptchaToken,
      });

      const { access_token, user: newUser } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(newUser));

      setRegSuccess('Account created. Redirecting to your workspace...');
      setTimeout(() => navigate('/tenant'), 900);
    } catch (err) {
      console.error(err);
      setRecaptchaResetKey((k) => k + 1);
      setRegCaptchaToken('');
      let errMsg = 'Registration failed. Please try again.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setRegError(errMsg);
    } finally {
      setRegLoading(false);
    }
  };

  const backToMethods = () => {
    setLoginStep('methods');
    setLoginError(null);
    setOtpSentMsg(null);
    setDevOtp(null);
  };

  return (
    <div className={`login-split-container ${mode === 'register' ? 'register-mode' : ''}`}>
      <div className="login-left-panel">
        <div className="login-brand">
          <div className="login-brand-logo">
            {brand.appLogo ? (
              <img src={brand.appLogo} alt={brand.appName} className="sidebar-logo-img" />
            ) : (
              <Building2 size={20} />
            )}
          </div>
          {brand.ready && brand.brandMode === 'name' && brand.appName && (
            <span className="login-brand-name">{brand.appName}.</span>
          )}
        </div>

        <div className="login-hero-content">
          <h2 className="login-hero-title">Run your mall from one dashboard.</h2>
          <p className="login-hero-desc">
            Tenants, operations, and reports — handled in a single secure workspace, without exposing any production details.
          </p>

          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => goMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="login-left-footer">
          SIM Mall &copy; 2026. Made with Premium Monochrome Style.
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-card">
          {mode === 'login' ? (
            <div key="login" className="auth-form">
              <h2 className="login-form-title">Sign In</h2>
              <p className="login-form-subtitle">Choose a sign-in method to enter your workspace.</p>

              {loginError && (
                <div className="alert alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="alert alert-success">
                  <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{loginSuccess}</span>
                </div>
              )}

              {loginStep === 'methods' && (
                <div className="method-root">
                  <form onSubmit={handlePasswordLogin} autoComplete="off">
                    <div className="form-group">
                      <label className="form-label" htmlFor="email">Email</label>
                      <div className="form-input-wrapper">
                        <div className="form-input-icon">
                          <Mail size={15} />
                        </div>
                        <input
                          id="email"
                          type="text"
                          className="form-input"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={passLoading}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="password">Password</label>
                      <div className="form-input-wrapper">
                        <div className="form-input-icon">
                          <Lock size={15} />
                        </div>
                        <input
                          id="password"
                          type={showPass ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={passLoading}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="form-input-toggle"
                          onClick={() => setShowPass((v) => !v)}
                          aria-label={showPass ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Register is only reachable from the hero panel's "Sign Up"
                        pill, which sits ~690px up the page once the layout stacks
                        on narrow screens. This keeps that link next to the form. */}
                    <a
                      className="auth-mode-link"
                      href="?mode=register"
                      onClick={(e) => {
                        // goMode already syncs the query string, so letting the
                        // anchor navigate as well would add a second history entry.
                        e.preventDefault();
                        goMode('register');
                      }}
                    >
                      Don&apos;t have an account? <span>Register</span>
                    </a>

                    <button className="btn-primary" type="submit" disabled={passLoading} style={{ marginTop: '12px', width: '100%' }}>
                      {passLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Login</span>
                      )}
                    </button>
                  </form>

                  <div className="method-divider">
                    <span>or continue with</span>
                  </div>

                  <div className="method-list">
                    <button
                      type="button"
                      className="method-btn"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                    >
                      {googleLoading ? <Loader2 size={17} className="spinner" /> : <GoogleLogo />}
                      <span>{googleLoading ? 'Signing in with Google...' : 'Google'}</span>
                    </button>
                    <button
                      type="button"
                      className="method-btn"
                      onClick={() => {
                        setLoginError(null);
                        setLoginStep('email');
                      }}
                    >
                      <Mail size={17} />
                      <span>Email</span>
                    </button>
                  </div>

                  <div className="quick-fill-container">
                    <button
                      className="quick-fill-btn"
                      onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                    >
                      {showDemoAccounts ? 'Hide Demo Accounts' : 'Show Demo Accounts'}
                    </button>

                    {showDemoAccounts && (
                      <div className="quick-fill-grid">
                        {demoAccounts.map((acc, index) => (
                          <div
                            key={index}
                            className="quick-fill-item"
                            onClick={() => handleQuickFill(acc)}
                          >
                            <span className="quick-fill-role">{acc.role}</span>
                            <span className="quick-fill-user">{acc.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loginStep === 'email' && (
                <div className="method-panel">
                  <div className="method-subheader">
                    <span>Sign in with email code</span>
                    <button type="button" className="method-back" onClick={backToMethods}>
                      Back
                    </button>
                  </div>

                  <form onSubmit={handleOtpRequest} autoComplete="off">
                    <div className="form-group">
                      <label className="form-label" htmlFor="otpEmail">Email</label>
                      <div className="form-input-wrapper">
                        <div className="form-input-icon">
                          <Mail size={15} />
                        </div>
                        <input
                          id="otpEmail"
                          type="email"
                          className="form-input"
                          placeholder="Enter your registered email"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          disabled={emailLoading}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <button className="btn-primary" type="submit" disabled={emailLoading} style={{ marginTop: '12px' }}>
                      {emailLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send Code</span>
                      )}
                    </button>
                  </form>

                  <p className="method-note">
                    A one-time code will be sent to your email only if it is registered.
                  </p>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="method-panel">
                  <div className="method-subheader">
                    <span>Enter the code</span>
                    <button
                      type="button"
                      className="method-back"
                      onClick={() => {
                        setLoginStep('email');
                        setLoginError(null);
                        setDevOtp(null);
                      }}
                    >
                      Change email
                    </button>
                  </div>

                  {otpSentMsg && (
                    <div className="alert alert-success" style={{ padding: '10px 12px' }}>
                      <CheckCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{otpSentMsg} Sent to <strong>{otpEmail}</strong>.</span>
                    </div>
                  )}

                  {devOtp && (
                    <div className="dev-otp-hint">
                      <span>Development preview — the code is: <strong>{devOtp}</strong></span>
                    </div>
                  )}

                  <form onSubmit={handleOtpVerify} autoComplete="off">
                    <div className="form-group">
                      <label className="form-label" htmlFor="otpCode">One-time code</label>
                      <input
                        id="otpCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        className="form-input otp-input"
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        disabled={otpLoading}
                      />
                    </div>

                    <button className="btn-primary" type="submit" disabled={otpLoading} style={{ marginTop: '12px' }}>
                      {otpLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify &amp; Sign In</span>
                      )}
                    </button>
                  </form>

                  <div className="resend-row">
                    {resendIn > 0 ? (
                      <span className="resend-timer">Resend available in {resendIn}s</span>
                    ) : (
                      <button type="button" className="resend-btn" onClick={resendCode} disabled={emailLoading}>
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div key="register" className="auth-form">
              <h2 className="login-form-title">Register</h2>
              <p className="login-form-subtitle">Register to access the tenant workspace.</p>

              {regError && (
                <div className="alert alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="alert alert-success">
                  <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegister} autoComplete="off">
                <div className="form-group">
                  <label className="form-label" htmlFor="regEmail">Email</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <Mail size={15} />
                    </div>
                    <input
                      id="regEmail"
                      type="text"
                      className="form-input"
                      placeholder="Enter your email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={regLoading}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regPassword">Password</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <Lock size={15} />
                    </div>
                    <input
                      id="regPassword"
                      type={showRegPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min. 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={regLoading}
                    />
                    <button
                      type="button"
                      className="form-input-toggle"
                      onClick={() => setShowRegPass((v) => !v)}
                      aria-label={showRegPass ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regConfirm">Confirm Password</label>
                  <div className="form-input-wrapper">
                    <div className="form-input-icon">
                      <Lock size={15} />
                    </div>
                    <input
                      id="regConfirm"
                      type={showRegConfirm ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Repeat your password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      disabled={regLoading}
                    />
                    <button
                      type="button"
                      className="form-input-toggle"
                      onClick={() => setShowRegConfirm((v) => !v)}
                      aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showRegConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <ReCaptcha
                  onVerify={(token) => setRegCaptchaToken(token)}
                  onExpired={() => {
                    setRegCaptchaToken('');
                    setRegError(null);
                  }}
                  resetKey={recaptchaResetKey}
                />

                <button className="btn-primary" type="submit" disabled={regLoading} style={{ marginTop: '12px' }}>
                  {regLoading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register</span>
                  )}
                </button>

                {/* Mirror of the Register link, so the trip back to Sign In is
                    reachable once the layout stacks and the hero pill is hidden
                    behind the form. */}
                <a
                  className="auth-mode-link"
                  href="?mode=login"
                  onClick={(e) => {
                    e.preventDefault();
                    goMode('login');
                  }}
                >
                  Already have an account? <span>Sign In</span>
                </a>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;