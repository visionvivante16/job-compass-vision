import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

const REQUIRED_FIELDS = ["full_name", "phone", "location", "resume_url"] as const;

export function useProfileComplete() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();

  const { isComplete, missingFields } = useMemo(() => {
    // While loading, assume complete to avoid false-positive gate flashes
    if (isLoading) return { isComplete: true, missingFields: [] as string[] };
    if (!user || !profile) return { isComplete: false, missingFields: REQUIRED_FIELDS as unknown as string[] };

    const missing: string[] = [];
    if (!profile.full_name?.trim()) missing.push("Full Name");
    if (!profile.phone?.trim()) missing.push("Phone");

    // Accept either combined `location` OR (city + state/country) as a valid location
    const hasLocation =
      !!profile.location?.trim() ||
      (!!profile.city?.trim() && (!!profile.state?.trim() || !!profile.country?.trim()));
    if (!hasLocation) missing.push("Location");

    if (!profile.resume_url?.trim()) missing.push("Resume");

    return { isComplete: missing.length === 0, missingFields: missing };
  }, [user, profile, isLoading]);

  return { isComplete, missingFields, isLoading };
}
