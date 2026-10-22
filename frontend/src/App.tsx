import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { WelcomePage } from './pages/WelcomePage';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import LiveVisionPage from './pages/LiveVisionPage';
import { JpsCamerasPage } from './pages/JpsCamerasPage';
import { ReportPage } from './pages/ReportPage';
import { NavigationPage } from './pages/NavigationPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResiliencePage } from './pages/ResiliencePage';
import { EstatePage } from './pages/EstatePage';

// three.js is only needed by the 3D studio, so it loads with that route instead of on every page.
const HouseStudio360 = lazy(() => import('./components/sandbox/HouseStudio360').then((m) => ({ default: m.HouseStudio360 })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/shelters" element={<Navigate to="/map" replace />} />
          <Route path="/live" element={<ProtectedRoute><LiveVisionPage /></ProtectedRoute>} />
          <Route path="/jps" element={<ProtectedRoute><JpsCamerasPage /></ProtectedRoute>} />
          <Route path="/resilience" element={<ProtectedRoute><ResiliencePage /></ProtectedRoute>} />
          <Route path="/estate" element={<ProtectedRoute><EstatePage /></ProtectedRoute>} />
          <Route path="/simulation" element={<Navigate to="/live" replace />} />
          <Route path="/studio" element={<ProtectedRoute><Suspense fallback={null}><HouseStudio360 /></Suspense></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/navigation/:shelterId" element={<ProtectedRoute><NavigationPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
