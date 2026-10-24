import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ShelterMapView } from '../components/map/ShelterMapView';

export function MapPage() {
  return (
    <AppShell>
        <ShelterMapView />
        </AppShell>
  );
}
