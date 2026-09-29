import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { Image, Settings as SettingsIcon, Square } from 'lucide-react';
import { toast } from '../../../components/toastBus';
import { assetUrl, setAppSettings } from '../../../components/appSettingsBus';
import ImageCropModal from '../../../components/ImageCropModal';
import { BACKEND_URL } from '../../../config';

interface SettingsMap {
  systemName: string;
  systemLogo: string | null;
  systemFavicon: string | null;
  systemContact: string | null;
  systemAddress: string | null;
  logoMode: boolean;
  updatedAt?: string;
}

function SettingsView() {
  const [settings, setSettings] = useState({
    systemName: '',
    systemContact: '',
    systemAddress: '',
  });
  const [brandMode, setBrandMode] = useState<'name' | 'logo'>('name');
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const [currentFavicon, setCurrentFavicon] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [pendingCrop, setPendingCrop] = useState<{ kind: 'logo' | 'favicon'; url: string; fileName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    axios
      .get<SettingsMap>(`${BACKEND_URL}/settings`)
      .then((res) => {
        if (ignore) return;
        const d = res.data;
        setSettings({
          systemName: d.systemName || '',
          systemContact: d.systemContact || '',
          systemAddress: d.systemAddress || '',
        });
        setBrandMode(d.logoMode ? 'logo' : 'name');
        // Server values are relative (`/uploads/...`); the preview <img> needs an
        // absolute URL or it resolves against the dev server and 404s.
        if (d.systemLogo) {
          setCurrentLogo(d.systemLogo);
          setLogoPreview(assetUrl(d.systemLogo));
        }
        if (d.systemFavicon) {
          setCurrentFavicon(d.systemFavicon);
          setFaviconPreview(assetUrl(d.systemFavicon));
        }
        setAppSettings({
          appName: d.systemName || 'SIM MALL',
          appLogo: d.systemLogo ?? '',
          favicon: d.systemFavicon ?? '',
          brandMode: d.logoMode ? 'logo' : 'name',
        });
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load settings from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPendingCrop({ kind: 'logo', url: URL.createObjectURL(file), fileName: file.name });
      e.target.value = '';
    }
  };

  const handleFaviconChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPendingCrop({ kind: 'favicon', url: URL.createObjectURL(file), fileName: file.name });
      e.target.value = '';
    }
  };

  const handleCropApply = async (file: File) => {
    if (!pendingCrop) return;
    const kind = pendingCrop.kind;
    const preview = URL.createObjectURL(file);
    setPendingCrop(null);
    try {
      // Persist straight away: a staged-but-unsaved logo looks like "uploaded but missing".
      const url = await uploadImage(file);
      const payload =
        kind === 'logo' ? { systemLogo: url } : { systemFavicon: url };
      await axios.patch(`${BACKEND_URL}/settings`, payload);
      if (kind === 'logo') {
        setLogoFile(null);
        setCurrentLogo(url);
        setLogoPreview(assetUrl(url));
        setAppSettings({ appLogo: url });
      } else {
        setFaviconFile(null);
        setCurrentFavicon(url);
        setFaviconPreview(assetUrl(url));
        setAppSettings({ favicon: url });
      }
      toast(kind === 'logo' ? 'Logo updated' : 'Favicon updated');
    } catch {
      // Fall back to staging the file so the Save button can retry it.
      if (kind === 'logo') {
        setLogoFile(file);
        setLogoPreview(preview);
      } else {
        setFaviconFile(file);
        setFaviconPreview(preview);
      }
      toast('Upload failed. Click Save changes to retry.');
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post<{ url: string }>(`${BACKEND_URL}/uploads/image`, fd);
    return res.data.url;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, string | boolean> = {
        systemName: settings.systemName,
        systemContact: settings.systemContact,
        systemAddress: settings.systemAddress,
        logoMode: brandMode === 'logo',
      };
      if (logoFile) payload.systemLogo = await uploadImage(logoFile);
      if (faviconFile) payload.systemFavicon = await uploadImage(faviconFile);
      await axios.patch(`${BACKEND_URL}/settings`, payload);
      setAppSettings({
        appName: settings.systemName || 'SIM MALL',
        appLogo: (payload.systemLogo as string) ?? currentLogo,
        favicon: (payload.systemFavicon as string) ?? currentFavicon,
        brandMode,
        appAddress: settings.systemAddress ?? '',
      });
      toast('Settings saved successfully');
      setLogoFile(null);
      setFaviconFile(null);
    } catch {
      toast('Failed to save settings.');
    }
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <h2 className="welcome-title"><SettingsIcon size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> System Settings</h2>
      <p className="welcome-text" style={{ marginBottom: '20px' }}>Global settings for the Mall Management Information System.</p>

      {loading ? (
        <p className="welcome-text">Loading data from database...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '640px' }}>
          <div className="settings-upload-grid">
            <div className="settings-upload-box">
              <label className="form-label"><Image size={14} style={{ verticalAlign: '-2px', marginRight: '5px' }} />System Logo</label>
              <div className="logo-upload-row">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="tenant-logo-preview" />
                ) : (
                  <span className="tenant-logo-preview placeholder"><Image size={20} /></span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  className="file-input"
                />
              </div>
              <small className="form-hint">PNG/JPG/SVG/WEBP, max 2&nbsp;MB.</small>
            </div>

            <div className="settings-upload-box">
              <label className="form-label"><Square size={14} style={{ verticalAlign: '-2px', marginRight: '5px' }} />Favicon</label>
              <div className="logo-upload-row">
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" className="favicon-preview" />
                ) : (
                  <span className="favicon-preview placeholder"><Square size={16} /></span>
                )}
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/webp"
                  onChange={handleFaviconChange}
                  className="file-input"
                />
              </div>
              <small className="form-hint">Recommended: square PNG or ICO 32&times;32 / 64&times;64.</small>
            </div>
          </div>

          <div className="toggle-row">
            <div>
              <label className="toggle-label">Show Application Name</label>
              <small className="toggle-desc">
                {brandMode === 'name'
                  ? 'Sidebar shows the logo together with the application name.'
                  : 'Sidebar shows the application logo only.'}
              </small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={brandMode === 'name'}
              aria-label="Toggle application name visibility"
              className={`toggle-switch ${brandMode === 'name' ? 'on' : ''}`}
              onClick={() => setBrandMode((m) => (m === 'name' ? 'logo' : 'name'))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">System Name</label>
            <input
              type="text"
              className="simulator-input"
              value={settings.systemName}
              onChange={(e) => handleChange('systemName', e.target.value)}
              placeholder="SIM MALL"
            />
          </div>
          <div className="form-group">
            <label className="form-label">System Contact</label>
            <input
              type="text"
              className="simulator-input"
              value={settings.systemContact}
              onChange={(e) => handleChange('systemContact', e.target.value)}
              placeholder="phone, email, or WhatsApp"
            />
            <small className="form-hint">One line, e.g. &ldquo;+62 21 555 0123 | admin@mall.com&rdquo;.</small>
          </div>
          <div className="form-group">
            <label className="form-label">System Address</label>
            <input
              type="text"
              className="simulator-input"
              value={settings.systemAddress}
              onChange={(e) => handleChange('systemAddress', e.target.value)}
              placeholder="mall address"
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ maxWidth: '180px' }}>
            Save Configuration
          </button>
        </form>
      )}
      {pendingCrop && (
        <ImageCropModal
          imageUrl={pendingCrop.url}
          fileName={pendingCrop.fileName}
          onCancel={() => setPendingCrop(null)}
          onApply={handleCropApply}
        />
      )}
    </div>
  );
}

export default SettingsView;
