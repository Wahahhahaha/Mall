export interface UserInfo {
  userid: number;
  email: string;
  level: string;
  levelid?: number;
  phone?: string | null;
}

export interface DBStats {
  userCount: number;
  levelCount: number;
  levels: Array<{
    levelid: number;
    levelname: string;
    _count: { users: number };
  }>;
  tenantCount: number;
  eventCount: number;
  floorCount: number;
  locationCount: number;
  parkingCount: number;
  requestCount: number;
  activeRequests: number;
  pendingRequests: number;
  activeParking: number;
  mallFeeSum: number;
  status: string;
}
