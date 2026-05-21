import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useMyPermissions, useAllUsers, useUpdateUserRole } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Loader2, Shield, Crown, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HiringGraphManager } from "@/components/founder/HiringGraphManager";

import { EmailNotificationManager } from "@/components/founder/EmailNotificationManager";
import { ManualPremiumManager } from "@/components/founder/ManualPremiumManager";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export default function FounderEmployers() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: permissions, isLoading: permLoading } = useMyPermissions();
  const { data: users = [], isLoading: usersLoading } = useAllUsers();
  const updateRole = useUpdateUserRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 20;
  const queryClient = useQueryClient();
  const isLoading = authLoading || permLoading;
  const isFounder = permissions?.isFounder;

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Exclude current founder from list (can't change own role)
  const otherUsers = filteredUsers.filter((u) => u.id !== user?.id);

  // Pagination
  const totalPages = Math.ceil(otherUsers.length / USERS_PER_PAGE);
  const paginatedUsers = otherUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleRoleChange = async (userId: string, newRole: "user" | "employer" | "founder") => {
    await updateRole.mutateAsync({ userId, newRole });
  };

  const handlePremiumToggle = async (userId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: !currentValue })
        .eq("user_id", userId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success(`Premium ${!currentValue ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error("Failed to update premium: " + err.message);
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "founder":
        return <Crown className="h-4 w-4 text-accent-foreground" />;
      case "employer":
        return <Shield className="h-4 w-4 text-primary" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string | null): "default" | "secondary" | "accent" => {
    switch (role) {
      case "founder":
        return "default";
      case "employer":
        return "accent";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !isFounder) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Hiring Graph Manager - Founder Only */}
        <div className="mb-8">
          <HiringGraphManager />
        </div>


        {/* Email Notification Manager - Founder Only */}
        <div className="mb-8">
          <EmailNotificationManager
            users={otherUsers.map((u) => ({ id: u.id, email: u.email, full_name: u.full_name }))}
          />
        </div>

        {/* Manual Premium Grants - Founder Only */}
        <div className="mb-8">
          <ManualPremiumManager />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Manage Users & Employers
            </h1>
            <p className="text-muted-foreground">
              Assign roles to users (User, Employer, or Founder)
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">User - Regular job seeker</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Employer - Can post/manage their jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm text-muted-foreground">Founder - Full access</span>
          </div>
        </div>

        {/* Users List */}
        {usersLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : otherUsers.length === 0 ? (
          <Card className="p-12 text-center border-border/60">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "No other registered users yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedUsers.map((userData) => (
              <Card
                key={userData.id}
                className="p-4 border-border/60 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {getRoleIcon(userData.role)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {userData.full_name || userData.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {userData.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`h-3.5 w-3.5 ${userData.is_premium ? "text-accent" : "text-muted-foreground/40"}`} />
                      <Switch
                        checked={userData.is_premium}
                        onCheckedChange={() => handlePremiumToggle(userData.id, userData.is_premium)}
                      />
                    </div>

                    <Badge variant={getRoleBadgeVariant(userData.role)}>
                      {userData.role || "user"}
                    </Badge>
                    
                    <div className="w-36">
                      <Label htmlFor={`role-${userData.id}`} className="sr-only">
                        Change role
                      </Label>
                      <Select
                        value={userData.role || "user"}
                        onValueChange={(value) => handleRoleChange(userData.id, value as "user" | "employer" | "founder")}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger id={`role-${userData.id}`} className="h-9">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              User
                            </div>
                          </SelectItem>
                          <SelectItem value="employer">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Employer
                            </div>
                          </SelectItem>
                          <SelectItem value="founder">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Founder
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {totalPages > 7 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing {(currentPage - 1) * USERS_PER_PAGE + 1}–{Math.min(currentPage * USERS_PER_PAGE, otherUsers.length)} of {otherUsers.length} users
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
