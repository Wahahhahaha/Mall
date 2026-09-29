import {
  LayoutDashboard,
  Car,
  Map,
  Calendar,
  Layers,
  Store,
  ClipboardList,
  Users,
  Clock,
  Database,
  Trash2,
  Lock,
  Settings,
  CalendarCheck,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PageAction {
  key: string;
  label: string;
}

export interface PageDef {
  key: string;
  label: string;
  icon: LucideIcon;
  actions: PageAction[];
}

/**
 * Canonical permission pages. Every dashboard menu maps to a page key; the
 * `view` action controls whether the menu/route is reachable, the other
 * actions gate feature-level operations inside the page.
 */
export const PERMISSION_PAGES: PageDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, actions: [{ key: 'view', label: 'View' }] },
  {
    key: 'parkir',
    label: 'Parking',
    icon: Car,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'checkin', label: 'Check-In' },
      { key: 'checkout', label: 'Check-Out' },
      { key: 'logs', label: 'View Logs' },
    ],
  },
  {
    key: 'map',
    label: 'Indoor Map',
    icon: Map,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'manage', label: 'Manage Locations' },
    ],
  },
  {
    key: 'event-data',
    label: 'Event Data',
    icon: Calendar,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'floor-data',
    label: 'Floor Data',
    icon: Layers,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'tenant-data',
    label: 'Tenant Data',
    icon: Store,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'lease-requests',
    label: 'Lease Requests',
    icon: ClipboardList,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'approve', label: 'Approve' },
      { key: 'reject', label: 'Reject' },
    ],
  },
  {
    key: 'user-data',
    label: 'User Data',
    icon: Users,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'reset', label: 'Reset Password' },
    ],
  },
  { key: 'activity-log', label: 'Activity Log', icon: Clock, actions: [{ key: 'view', label: 'View' }] },
  {
    key: 'backup',
    label: 'Backup',
    icon: Database,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'download', label: 'Download' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'trash',
    label: 'Trash',
    icon: Trash2,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'restore', label: 'Restore' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'permission',
    label: 'Permission',
    icon: Lock,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'manage', label: 'Manage' },
    ],
  },
  {
    key: 'setting',
    label: 'Settings',
    icon: Settings,
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
    ],
  },
  {
    key: 'report',
    label: 'Report',
    icon: CalendarCheck,
    actions: [{ key: 'view', label: 'View' }],
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: UserIcon,
    actions: [{ key: 'view', label: 'View' }],
  },
];

/** Default when no rule row exists yet: views on, other actions off. */
export const isGrantedByDefault = (action: string) => action === 'view';