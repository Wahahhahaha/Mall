import { useSyncExternalStore, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building2, Loader2, Lock, Mail, Phone, Save, UserCog } from 'lucide-react';
import { toast } from '../../components/toastBus';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { BACKEND_URL } from '../../config';
import type { UserInfo } from '../../types';

function readUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const navigate = useNavigate();
  const user = readUser();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const emailClean = email.trim();
    const phoneClean = phone.trim();
    if (!emailClean) {
      toast('Email is required.');
      return;
    }
    if (password && password.length < 6) {
      toast('Password must be at least 6 characters.');
      return;
    }
    const payload: { email: string; phone?: string | null; password?: string } = {
      email: emailClean,
      phone: phoneClean || null,
    };
    if (password) payload.password = password;
    setSaving(true);
    try {
      const res = await axios.patch<{ userid: number; email: string; level?: { levelname: string }; phone?: string | null }>(
        `${BACKEND_URL}/users/${user.userid}`,
        payload
      );
      const updated: UserInfo = {
        userid: res.data.userid,
        email: res.data.email,
        level: res.data.level?.levelname ?? user.level,
        phone: res.data.phone ?? null,
      };
      localStorage.setItem('user', JSON.stringify(updated));
      setEmail(updated.email);
      setPhone(updated.phone ?? '');
      setPassword('');
      toast('Profile updated successfully');
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to update profile.';
      toast(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <button type="button" className="profile-back-btn" onClick={() => navigate('/parkir')}>
        <ArrowLeft size={15} /> Back to Parking Console
      </button>

      <div className="profile-card">
        <div className="profile-banner">
          <div className="profile-avatar-large">
            {(user?.email ?? '?').substring(0, 1).toUpperCase()}
          </div>
          <div className="profile-banner-text">
            <h1 className="profile-title"><UserCog size={20} /> Edit Profile</h1>
            <p className="profile-sub">{brand.ready && brand.appName ? brand.appName : ''} &middot; Parking Operator Portal</p>
          </div>
        </div>

        <div className="profile-info-strip">
          <div className="profile-info-item">
            <span className="profile-info-label"><Mail size={12} /> Account</span>
            <span className="profile-info-value">{user?.email ?? '—'}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label"><Building2 size={12} /> Role</span>
            <span className="profile-info-value">{user?.level ?? 'Parkir'}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label"><Phone size={12} /> Phone</span>
            <span className="profile-info-value">{user?.phone ?? 'Not set'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label className="form-label" htmlFor="pEmail">
              <Mail size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} /> Email
            </label>
            <input
              id="pEmail"
              type="email"
              className="simulator-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              placeholder="name@mall.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pPhone">
              <Phone size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} /> Phone
            </label>
            <input
              id="pPhone"
              type="tel"
              className="simulator-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              placeholder="+62 8xx xxxx xxxx"
            />
          </div>

          <div className="form-group profile-span">
            <label className="form-label" htmlFor="pPassword">
              <Lock size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} /> New Password
              <small className="form-hint" style={{ marginLeft: '8px' }}>(leave blank to keep current)</small>
            </label>
            <input
              id="pPassword"
              type="password"
              className="simulator-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="profile-form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/parkir')} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary profile-save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spinner" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
