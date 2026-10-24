import { Plus } from 'lucide-react';
import { interactive } from '../shared/ui';

export function AddCameraCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-card border border-dashed border-action/50 bg-advisory-bg px-3 text-sm font-semibold text-link hover:bg-advisory-bg ${interactive}`}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add my camera
    </button>
  );
}
