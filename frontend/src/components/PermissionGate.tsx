import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { usePermissions } from '../permissionBus';

interface PermissionGateProps {
  page: string;
  children: ReactNode;
}

function PermissionGate({ page, children }: PermissionGateProps) {
  const perms = usePermissions();
  if (!perms.ready) return null;
  if (!perms.can(page, 'view')) {
    return (
      <div
        className="simulator-panel"
        style={{ marginTop: 0, textAlign: 'center', padding: '56px 24px' }}
      >
        <Lock size={30} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <h3 className="welcome-title">No access</h3>
        <p className="welcome-text">
          Your role does not have permission to view this page. Ask an administrator to grant you
          access from the Permission matrix.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export default PermissionGate;