import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shelter, CitizenReport, SosEvent, IoTStationTelemetry } from '../types';
import { fetchShelters, fetchReports } from '../services/api';

interface AppContextType {
  shelters: Shelter[];
  /** true once the shelter fetch has finished (successfully or not), so screens can tell loading from empty. */
  sheltersReady: boolean;
  reports: CitizenReport[];
  activeSos: SosEvent | null;
  setActiveSos: (sos: SosEvent | null) => void;
  familySafetyStatus: 'IDLE' | 'SOS_ACTIVE' | 'ARRIVED_SAFE';
  setFamilySafetyStatus: (status: 'IDLE' | 'SOS_ACTIVE' | 'ARRIVED_SAFE') => void;
  telemetry: IoTStationTelemetry;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  addReport: (r: CitizenReport) => void;
  upvoteReport: (id: string) => void;
  approveReport: (id: string, reviewerName: string, role: string, notes?: string) => void;
  rejectReport: (id: string, reason?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState('Kampung Baru, Kuala Lumpur');
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [sheltersReady, setSheltersReady] = useState(false);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [activeSos, setActiveSos] = useState<SosEvent | null>(null);
  const [familySafetyStatus, setFamilySafetyStatus] = useState<'IDLE' | 'SOS_ACTIVE' | 'ARRIVED_SAFE'>('IDLE');

  const [telemetry, setTelemetry] = useState<IoTStationTelemetry>({
    deviceId: 'fw-node-01',
    name: 'Kampung Baru Station (Klang River)',
    mountHeightCm: 400,
    distanceCm: 280,
    waterLevelM: 1.20,
    waterDepthCm: 120,
    stage: 'Warning',
    batteryPct: 94,
    isOnline: true,
    lastUpdated: '2 min ago'
  });

  useEffect(() => {
    fetchShelters().then(setShelters).finally(() => setSheltersReady(true));
    fetchReports().then(setReports);
  }, []);


  const addReport = (r: CitizenReport) => {
    setReports((prev) => [r, ...prev]);
  };

  const upvoteReport = (id: string) => {
    setReports((prev) =>
      prev.map((item) => (item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item))
    );
  };

  const approveReport = (id: string, reviewerName: string, role: string, notes?: string) => {
    setReports((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'OFFICIAL_VERIFIED',
              humanVerification: {
                verifiedBy: reviewerName,
                role: (role as any) || 'Demo reviewer',
                reviewedAt: 'Just now',
                verdict: 'APPROVED',
                officialNotes: notes || 'Approved in the demo review desk. No agency was involved.',
              },
            }
          : item
      )
    );
  };

  const rejectReport = (id: string, reason?: string) => {
    setReports((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'REJECTED',
              humanVerification: {
                verifiedBy: 'Demo reviewer',
                role: 'Demo reviewer' as any,
                reviewedAt: 'Just now',
                verdict: 'REJECTED',
                officialNotes: reason || 'Rejected in the demo review desk.',
              },
            }
          : item
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        shelters,
        sheltersReady,
        reports,
        activeSos,
        setActiveSos,
        familySafetyStatus,
        setFamilySafetyStatus,
        telemetry,
        selectedLocation,
        setSelectedLocation,
        addReport,
        upvoteReport,
        approveReport,
        rejectReport
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
