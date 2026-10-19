// The sample cameras' AI-generated photos: 12 rungs per camera, r000 to r110, where
// the number is the water height as a share of bank height times 100. Used when the server is unreachable, so the page
// shows the same picture the reading would have described.
const PREFIX: Record<string, string> = {
  'sample-klang-jamek': 'klang',
  'sample-gombak-tun-razak': 'gombak',
  'sample-smart-tunnel': 'smart',
  'sample-batu-sentul': 'batu',
  'sample-kampung-baru-drain': 'drain',
};

/** The photo for the rung nearest `ratio` (0 = bed, 1 = bank top), or null for a camera that has no photos. */
export function samplePhotoUrl(cameraId: string, ratio: number): string | null {
  const prefix = PREFIX[cameraId];
  if (!prefix) return null;
  const rung = Math.min(11, Math.max(0, Math.round(ratio * 10)));
  return `/media/live/${prefix}-r${String(rung * 10).padStart(3, '0')}.webp`;
}
