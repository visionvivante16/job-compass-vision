import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

const US_VALUES = ["united states", "us", "usa"];

export function useIsUSUser(): boolean {
  const { user } = useAuth();
  const { profile } = useProfile();

  return useMemo(() => {
    if (!user || !profile?.country) return false;
    return US_VALUES.includes(profile.country.toLowerCase().trim());
  }, [user, profile?.country]);
}
