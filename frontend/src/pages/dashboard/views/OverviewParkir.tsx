import React, { useState } from 'react';
import { Car, Clock, DollarSign, Plus, TrendingUp } from 'lucide-react';
import Select from '../../../components/Select';
import ErpPageHead from '../../../components/dashboard/ErpPageHead';
import ErpKpiCard from '../../../components/dashboard/ErpKpiCard';
import ErpPanel from '../../../components/dashboard/ErpPanel';
import ErpBarChart from '../../../components/dashboard/ErpBarChart';

type ParkingVehicleType = 'Mobil' | 'Motor';

const VEHICLE_TYPE_LABELS: Record<ParkingVehicleType, string> = {
  Mobil: 'Car',
  Motor: 'Motorcycle',
};

const HOURLY_ENTRIES = [
  { label: '10h', value: 42 },
  { label: '11h', value: 68 },
  { label: '12h', value: 91 },
  { label: '13h', value: 76 },
  { label: '14h', value: 84 },
  { label: '15h', value: 63 },
  { label: '16h', value: 45 },
];

function OverviewParkir() {
  const [parkingLogs, setParkingLogs] = useState<Array<{
    id: string;
    plate: string;
    type: ParkingVehicleType;
    entryTime: string;
    exitTime?: string;
    fee?: number;
    status: 'Parked' | 'Completed';
  }>>([
    { id: '1', plate: 'B 1234 CDE', type: 'Mobil', entryTime: '19:40:15', status: 'Parked' },
    { id: '2', plate: 'D 8899 XYZ', type: 'Motor', entryTime: '20:15:30', status: 'Parked' },
    { id: '3', plate: 'B 4321 KPL', type: 'Mobil', entryTime: '17:10:00', exitTime: '21:30:00', fee: 40000, status: 'Completed' },
  ]);
  const [newPlate, setNewPlate] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<ParkingVehicleType>('Mobil');

  const activeCount = parkingLogs.filter((log) => log.status === 'Parked').length;

  const handleAddParking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog = {
      id: Date.now().toString(),
      plate: newPlate.toUpperCase(),
      type: newVehicleType,
      entryTime: timeStr,
      status: 'Parked' as const
    };

    setParkingLogs([newLog, ...parkingLogs]);
    setNewPlate('');
  };

  const handleCheckoutParking = (id: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    setParkingLogs(parkingLogs.map(log => {
      if (log.id === id) {
        const rate = log.type === 'Mobil' ? 10000 : 5000;
        return {
          ...log,
          exitTime: timeStr,
          fee: rate * 2,
          status: 'Completed'
        };
      }
      return log;
    }));
  };

  return (
    <>
      <ErpPageHead
        title="Dashboard"
        sub={
          <>
            You are using the <b>SIM Mall Parking</b> operator module. Record vehicle entries and calculate parking
            fees dynamically below.
          </>
        }
        chip={<span className="erp-chip navy">Parking Operator</span>}
      />

      <div className="erp-kpi-row">
        <ErpKpiCard
          icon={<Car size={20} />}
          label="Slot Availability"
          value="1.245 / 1.500"
          sub="Car & motorcycle slots still sufficient."
        />
        <ErpKpiCard
          icon={<Clock size={20} />}
          label="Average Duration"
          value="2,4 Jam"
          sub="Visit duration for 4-wheel & 2-wheel vehicles."
          tone="amber"
        />
        <ErpKpiCard
          icon={<DollarSign size={20} />}
          label="Today's Revenue"
          value="Rp 12,45 Jt"
          sub="Accumulated daily parking payments."
          tone="green"
          delta="+6%"
        />
        <ErpKpiCard
          icon={<Car size={20} />}
          label="Active Vehicles"
          value={`${activeCount}`}
          sub="Vehicles currently parked in the building."
          tone="rose"
        />
      </div>

      <div className="erp-main-grid">
        <ErpPanel icon={<TrendingUp size={16} />} title="Gate Entries by Hour">
          <ErpBarChart data={HOURLY_ENTRIES} />
        </ErpPanel>

        <ErpPanel icon={<Car size={16} />} title="Live Gate Status" className="">
          <ul className="erp-list">
            <li className="erp-list-item">
              <span className="erp-list-badge green" />
              <div className="erp-list-main">
                <div className="erp-list-title">Gate A — Entry</div>
                <div className="erp-list-meta">Operational</div>
              </div>
              <span className="erp-chip green">Open</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge amber" />
              <div className="erp-list-main">
                <div className="erp-list-title">Gate B — Exit</div>
                <div className="erp-list-meta">Queue detected</div>
              </div>
              <span className="erp-chip amber">Busy</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge navy" />
              <div className="erp-list-main">
                <div className="erp-list-title">Basement C</div>
                <div className="erp-list-meta">Motorcycle zone</div>
              </div>
              <span className="erp-chip navy">Open</span>
            </li>
          </ul>
        </ErpPanel>
      </div>

      <ErpPanel icon={<Car size={16} />} title="Parking Gate Simulator (Tapping System)" className="">
        <form onSubmit={handleAddParking} className="simulator-form">
          <div className="simulator-input-group">
            <label className="form-label">Vehicle Plate Number</label>
            <input
              type="text"
              className="simulator-input"
              placeholder="e.g. B 1234 AB"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
            />
          </div>
          <div className="simulator-input-group">
            <label className="form-label">Vehicle Type</label>
            <Select
              value={newVehicleType}
              onChange={(v) => setNewVehicleType(v as ParkingVehicleType)}
              ariaLabel="Vehicle type"
              options={[
                { value: 'Mobil', label: 'Car (Rate Rp 10,000/hour)' },
                { value: 'Motor', label: 'Motorcycle (Rate Rp 5,000/hour)' },
              ]}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Record Entry
          </button>
        </form>

        <h4 style={{ margin: '20px 0 10px 0', color: 'var(--text-primary)' }}>Active Vehicle List</h4>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Type</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parkingLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 'bold', fontFamily: 'var(--mono)' }}>{log.plate}</td>
                  <td>{VEHICLE_TYPE_LABELS[log.type]}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{log.entryTime}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{log.exitTime || '-'}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{log.fee ? `Rp ${log.fee.toLocaleString('id-ID')}` : '-'}</td>
                  <td>
                    <span className={`status-badge ${log.status === 'Parked' ? 'solid' : 'outline'}`}>
                      {log.status === 'Parked' ? 'Parked' : 'Completed'}
                    </span>
                  </td>
                  <td>
                    {log.status === 'Parked' && (
                      <button
                        onClick={() => handleCheckoutParking(log.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Tap Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ErpPanel>
    </>
  );
}

export default OverviewParkir;