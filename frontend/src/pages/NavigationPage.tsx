import React from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { TurnByTurnEvacuation } from '../components/navigation/TurnByTurnEvacuation';

export function NavigationPage() {
  const { shelterId } = useParams<{ shelterId: string }>();

  return (
    <AppShell>
        <div className="flex-1 p-4 md:p-6">
          <TurnByTurnEvacuation shelterId={shelterId || 'shelter-01'} />
        </div>
        </AppShell>
  );
}
