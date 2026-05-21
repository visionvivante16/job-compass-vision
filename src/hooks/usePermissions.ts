import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface EmployerPermissions {
  id: string;
  employer_id: string;
  user_id: string;
  can_post_jobs: boolean;
  can_edit_jobs: boolean;
  can_delete_jobs: boolean;
  can_view_graphs: boolean;
  can_import_google_sheet: boolean;
  can_manage_team: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  employer_id: string | null;
  is_active: boolean;
  is_premium: boolean;
  role: string | null;
  permissions: EmployerPermissions | null;
}

// Hook to get current user's permissions
export function useMyPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-permissions", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is founder
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["founder", "admin"])
        .maybeSingle();

      const isFounder = roleData?.role === "founder" || roleData?.role === "admin";

      if (isFounder) {
        return {
          isFounder: true,
          isEmployer: false,
          can_post_jobs: true,
          can_edit_jobs: true,
          can_delete_jobs: true,
          can_view_graphs: true,
          can_import_google_sheet: true,
          can_manage_team: true,
        };
      }

      // Check if user has employer role
      const { data: employerRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "employer")
        .maybeSingle();

      if (employerRole) {
        // User has employer role - give them standard employer permissions
        return {
          isFounder: false,
          isEmployer: true,
          can_post_jobs: true,
          can_edit_jobs: true,
          can_delete_jobs: true,
          can_view_graphs: true,
          can_import_google_sheet: false,
          can_manage_team: false,
        };
      }

      return {
        isFounder: false,
        isEmployer: false,
        can_post_jobs: false,
        can_edit_jobs: false,
        can_delete_jobs: false,
        can_view_graphs: false,
        can_import_google_sheet: false,
        can_manage_team: false,
      };
    },
    enabled: !!user,
  });
}

// Hook to get the user's role (with priority: founder > employer > user)
export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch all roles for this user
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // Roles fetched for debugging if needed

      if (!roles || roles.length === 0) {
        return "user";
      }

      // Priority: founder > employer > user
      const roleSet = new Set(roles.map(r => r.role));
      if (roleSet.has("founder")) return "founder";
      if (roleSet.has("employer")) return "employer";
      return "user";
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes to avoid excessive refetching
    refetchOnMount: true,
  });
}

// Hook to get all user roles (for debugging)
export function useAllUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data } = await supabase
        .from("user_roles")
        .select("role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      return data || [];
    },
    enabled: !!user,
  });
}

// Hook for founder to fetch all users for management
export function useAllUsers() {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, employer_id, is_active, is_premium")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Get all employer permissions
      const { data: permissions } = await supabase
        .from("employer_permissions")
        .select("*");

      // Combine data - prioritize founder/employer roles over 'user'
      const usersWithRoles: UserWithProfile[] = (profiles || []).map((profile) => {
        const userRoles = roles?.filter((r) => r.user_id === profile.user_id) || [];
        // Pick the highest priority role
        const priorityRole = userRoles.find(r => r.role === "founder") 
          || userRoles.find(r => r.role === "employer")
          || userRoles.find(r => r.role === "user")
          || { role: "user" };
        const userPermissions = permissions?.find((p) => p.user_id === profile.user_id);

        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          employer_id: profile.employer_id,
          is_active: profile.is_active,
          is_premium: profile.is_premium ?? false,
          role: priorityRole.role,
          permissions: userPermissions || null,
        };
      });

      return usersWithRoles;
    },
  });
}

// Hook to update user role (founder, employer, user)
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: "user" | "employer" | "founder";
    }) => {
      // First, delete existing non-user roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", ["founder", "employer"]);

      // If new role is not 'user', insert the new role
      if (newRole !== "user") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      // If demoting from employer, also remove employer permissions
      if (newRole === "user") {
        await supabase
          .from("employer_permissions")
          .delete()
          .eq("user_id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });
}

// Hook to update user permissions
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      employerId,
      permissions,
    }: {
      userId: string;
      employerId: string;
      permissions: Partial<Omit<EmployerPermissions, "id" | "employer_id" | "user_id" | "created_at" | "updated_at">>;
    }) => {
      // Check if permissions record exists
      const { data: existing } = await supabase
        .from("employer_permissions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("employer_permissions")
          .update(permissions)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("employer_permissions")
          .insert({
            user_id: userId,
            employer_id: employerId,
            ...permissions,
          });
        if (error) throw error;
      }

      // Also add 'employer' role if any permission is granted
      const hasAnyPermission = Object.values(permissions).some((v) => v === true);
      if (hasAnyPermission) {
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "employer")
          .maybeSingle();

        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: userId,
            role: "employer",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Permissions updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update permissions: " + error.message);
    },
  });
}

// Hook to update user profile (employer_id, is_active)
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { employer_id?: string | null; is_active?: boolean };
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("User profile updated");
    },
    onError: (error) => {
      toast.error("Failed to update user: " + error.message);
    },
  });
}

// Quick toggle: Make employer admin (enable all main permissions)
export function useMakeEmployerAdmin() {
  const updateRole = useUpdateUserRole();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return updateRole.mutateAsync({
        userId,
        newRole: "employer",
      });
    },
  });
}

// Remove all employer permissions
export function useRemoveEmployerPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete permissions
      const { error: permError } = await supabase
        .from("employer_permissions")
        .delete()
        .eq("user_id", userId);
      if (permError) throw permError;

      // Remove employer role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "employer");
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Employer permissions removed");
    },
    onError: (error) => {
      toast.error("Failed to remove permissions: " + error.message);
    },
  });
}
