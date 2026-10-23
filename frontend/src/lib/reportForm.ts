export interface ReportFormErrors { title?: string; location?: string }

/** Plain-language checks for the report form. Empty object means it can be sent. */
export function validateReport(title: string, location: string): ReportFormErrors {
  const e: ReportFormErrors = {};
  if (title.trim().length < 5) e.title = 'Say what you see, in a few words. Example: Water over the road near the school.';
  if (!location.trim()) e.location = 'Tell us where this is.';
  return e;
}

/** Depth in words people use, for the label next to the slider. */
export function depthWords(cm: number): string {
  if (cm < 15) return 'ankle deep or less';
  if (cm < 35) return 'up to the ankle or shin';
  if (cm < 60) return 'about knee deep';
  if (cm < 100) return 'about waist deep';
  return 'deeper than waist deep';
}
