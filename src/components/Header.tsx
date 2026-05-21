import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserRole, useAllUserRoles } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";
import { Briefcase, Menu, X, LogOut, Shield, User, Crown, ChevronDown, Sparkles, HelpCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { triggerDashboardReset } from "@/lib/dashboardReset";
import { buildCheckoutUrl } from "@/lib/pricing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { data: userRole } = useUserRole();
  const { data: allRoles } = useAllUserRoles();
  const { profile, isLoading: profileLoading } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const STRIPE_LINK = buildCheckoutUrl({ createdAt: user?.created_at, email: user?.email, userId: user?.id });
  // While profile is loading, hide upgrade button to avoid flash for premium users
  const isPremium = profileLoading ? true : (profile?.is_premium ?? false);

  const isActive = (path: string) => location.pathname === path;

  const role = userRole || "user";
  const isFounder = role === "founder";
  const isEmployer = role === "employer";
  const visibleRoles = (allRoles ?? []).filter(({ role: assignedRole }) => assignedRole !== "user");
  const displayedRole =
    role === "founder"
      ? "founder"
      : visibleRoles.find(({ role: assignedRole }) => assignedRole === "founder")?.role ??
        visibleRoles.find(({ role: assignedRole }) => assignedRole === "admin")?.role ??
        null;
  const showRoleDetails = isAdmin && Boolean(displayedRole);

  const handleBrandClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!user) return;

    event.preventDefault();
    triggerDashboardReset();
    navigate("/dashboard", { replace: location.pathname === "/dashboard" });
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getNavLinks = () => {
    if (user && isEmployer && !isFounder) return [];
    if (!user) {
      return [
        { path: "/jobs", label: "Browse Jobs" },
        { path: "/about", label: "About" },
        { path: "/help", label: "Help" },
      ];
    }
    return [
      { path: "/dashboard", label: "Jobs" },
      { path: "/recommendations", label: "Recommendations" },
      { path: "/applied", label: "Applied" },
      { path: "/saved", label: "Saved" },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl backdrop-saturate-[1.8] supports-[backdrop-filter]:bg-background/50 shadow-[0_1px_0_0_hsl(var(--foreground)/0.03)]">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <img src="/favicon.png" alt="Sociax logo" className="h-9 w-9 rounded-xl shadow-soft group-hover:shadow-glow transition-shadow duration-300" />
            <span className="font-display font-bold text-lg text-foreground tracking-tight">Sociax.tech</span>
          </Link>

          {/* Desktop Navigation */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2" data-tour="nav-links">
              <div className="flex items-center bg-secondary/50 rounded-full p-0.5 gap-1.5 backdrop-blur-sm border border-border/20">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-full px-4 h-7 text-[13px] font-medium transition-all duration-200 ${
                          isActive(link.path)
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                        }`}
                      >
                        {link.label}
                      </Button>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </nav>
          )}

          {/* Right side */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 flex-nowrap">
            <FloatingHelpButton variant="inline" />
            <ThemeToggle />
            
            {user ? (
              <>
                {/* PROMO: app is free for everyone — Upgrade button hidden */}
                {(!isEmployer || isFounder) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 px-2 text-muted-foreground hover:text-foreground gap-1"
                    >
                      <ProfileAvatar size="sm" showPicker={false} />
                      <span className="hidden lg:inline text-[13px]">Profile</span>
                      <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-1rem)] rounded-xl border-border/50 shadow-premium">
                    <div className="flex items-center gap-3 px-2 py-2 min-w-0">
                      <ProfileAvatar size="md" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground truncate">{profile?.full_name || profile?.first_name || "User"}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-lg">
                        <User className="h-4 w-4 mr-2" />
                        My Profile
                      </DropdownMenuItem>
                      {showRoleDetails && displayedRole && (
                        <>
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 mb-1">
                              <span>Role:</span>
                              <Badge variant={displayedRole === "founder" ? "default" : "secondary"} className="text-xs">
                                {displayedRole}
                              </Badge>
                            </div>
                            {visibleRoles.length > 1 && (
                              <div className="flex flex-wrap gap-1">
                                <span>All:</span>
                                {visibleRoles.map((assignedRole, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{assignedRole.role}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-lg">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {isEmployer && !isFounder && (
                  <>
                    <Link to="/employer">
                      <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-[12px] border-border hover:bg-secondary">
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        Admin
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full h-8 px-2.5 text-destructive hover:text-destructive">
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}

                {isFounder && (
                  <>
                    <Link to="/founder/employers">
                      <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-[12px] border-border hover:bg-secondary">
                        <Crown className="h-3.5 w-3.5 mr-1" />
                        Founder
                      </Button>
                    </Link>
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-[12px] border-border hover:bg-secondary">
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        Admin
                      </Button>
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="rounded-full h-9 px-4 text-muted-foreground hover:text-foreground">
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?signup=true">
                  <Button size="sm" className="rounded-full h-9 px-5 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm hover:shadow-glow transition-all duration-300">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-slide-up">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive(link.path) ? "secondary" : "ghost"}
                    className="w-full justify-start rounded-xl"
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    {(!isEmployer || isFounder) && (
                      <Link to="/profile" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl justify-start">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                      </Link>
                    )}
                    {showRoleDetails && displayedRole && (
                      <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                        <span>Current role:</span>
                        <Badge variant={displayedRole === "founder" ? "default" : "secondary"} className="text-xs">
                          {displayedRole}
                        </Badge>
                      </div>
                    )}
                    {isEmployer && !isFounder && (
                      <Link to="/employer" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    {isFounder && (
                      <>
                        <Link to="/founder/employers" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl justify-start">
                            <Crown className="h-4 w-4 mr-2" />
                            Founder
                          </Button>
                        </Link>
                        <Link to="/admin" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full rounded-xl justify-start">
                            <Shield className="h-4 w-4 mr-2" />
                            Admin
                          </Button>
                        </Link>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full rounded-xl justify-start text-destructive hover:text-destructive"
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/auth" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">Log in</Button>
                    </Link>
                    <Link to="/auth?signup=true" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-accent hover:bg-accent/90">Sign up</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
