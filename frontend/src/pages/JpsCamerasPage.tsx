import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { JpsCameraWall } from '../components/live/jps/JpsCameraWall';

export function JpsCamerasPage() {
  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header />
        <JpsCameraWall />
        <BottomNav />
      </div>
    </div>
  );
}
