import type { UserInfo } from '../../../types';
import OverviewSuperadmin from './OverviewSuperadmin';
import OverviewAdmin from './OverviewAdmin';
import OverviewParkir from './OverviewParkir';
import OverviewManager from './OverviewManager';
import OverviewTenant from './OverviewTenant';

function RoleOverview() {
  const user: UserInfo = JSON.parse(localStorage.getItem('user')!);

  if (!user) return null;

  switch (user.level.toLowerCase()) {
    case 'superadmin':
      return <OverviewSuperadmin user={user} />;
    case 'admin':
      return <OverviewAdmin user={user} />;
    case 'parkir':
      return <OverviewParkir />;
    case 'manager':
      return <OverviewManager user={user} />;
    case 'tenant':
      return <OverviewTenant />;
    default:
      return null;
  }
}

export default RoleOverview;
