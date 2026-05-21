/**
 * Resume versioning utilities.
 * Generates a fingerprint from the current profile so that any cache
 * keyed on this value is automatically invalidated when the resume changes.
 */

export function getResumeVersion(profile: {
  resume_url?: string | null;
  resume_filename?: string | null;
  updated_at?: string;
  skills?: string[] | null;
  work_experience?: any;
} | null | undefined): string {
  if (!profile) return "no-profile";
  return [
    profile.resume_url || "",
    profile.resume_filename || "",
    profile.updated_at || "",
    JSON.stringify(profile.skills || []),
    JSON.stringify(profile.work_experience || []),
  ].join("::");
}
