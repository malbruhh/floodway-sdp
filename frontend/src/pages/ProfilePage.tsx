import React from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProfileSettings } from '../components/profile/ProfileSettings';
import { AboutDemo } from '../components/common/AboutDemo';

export function ProfilePage() {
  return (
    <AppShell>
        <ProfileSettings />
        <div className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6 lg:px-8">
          <AboutDemo />
        </div>
        </AppShell>
  );
}
