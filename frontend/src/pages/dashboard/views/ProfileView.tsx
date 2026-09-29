import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Loader2, Lock, Mail, Save, UserCog } from 'lucide-react';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import type { UserInfo } from '../../../types';

function readUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

export default function ProfileView() {
  const user = readUser();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const emailClean = email.trim();
    if (!emailClean) {
      toast('Email is required.');
      return;
    }
    setSavingInfo(true);
    try {
      const res = await axios.patch<{ userid: number; email: string; phone?: string | null }>(
        `${BACKEND_URL}/users/${user.userid}`,
        { email: emailClean, phone: phone.trim() || null },
      );
      const updated: UserInfo = {
        userid: res.data.userid,
        email: res.data.email,
        level: user.level,
        phone: res.data.phone ?? null,
      };
      localStorage.setItem('user', JSON.stringify(updated));
      setEmail(updated.email);
      setPhone(updated.phone ?? '');
      toast('Profile updated successfully');
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to update profile.';
      toast(message);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePw = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!currentPw) {
      toast('Please enter your current password.');
      return;
    }
    if (!newPw) {
      toast('Please enter a new password.');
      return;
    }
    if (newPw.length < 6) {
      toast('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      toast('New password and confirmation do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await axios.patch(`${BACKEND_URL}/users/${user.userid}/change-password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      toast('Password changed successfully');
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to change password.';
      toast(message);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header">
        <div>
          <h2 className="welcome-title"><UserCog size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> My Profile</h2>
          <p className="welcome-text">Manage your account settings and credentials.</p>
        </div>
      </div>

      <div className="profile-form" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mail size={16} /> Account Information
        </h3>
        <form onSubmit={handleSaveInfo}>
          <div className="form-group">
            <label className="form-label" htmlFor="dEmail">Email</label>
            <input
              id="dEmail"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={savingInfo}
              placeholder="name@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dPhone">Phone</label>
            <input
              id="dPhone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={savingInfo}
              placeholder="+62 8xx xxxx xxxx"
            />
          </div>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="submit" className="btn-secondary" disabled={savingInfo}>
              {savingInfo ? (
                <><Loader2 size={14} className="spinner" /> Saving...</>
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-form" style={{ marginTop: '28px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={16} /> Change Password
        </h3>
        <form onSubmit={handleChangePw}>
          <div className="form-group">
            <label className="form-label" htmlFor="dCurrentPw">Current Password</label>
            <input
              id="dCurrentPw"
              type="password"
              className="form-input"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              disabled={savingPw}
              placeholder="Enter your current password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dNewPw">New Password</label>
            <input
              id="dNewPw"
              type="password"
              className="form-input"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              disabled={savingPw}
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dConfirmPw">Confirm New Password</label>
            <input
              id="dConfirmPw"
              type="password"
              className="form-input"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              disabled={savingPw}
              placeholder="Re-enter new password"
            />
          </div>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="submit" className="btn-secondary" disabled={savingPw}>
              {savingPw ? (
                <><Loader2 size={14} className="spinner" /> Changing...</>
              ) : (
                <><Lock size={14} /> Change Password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
