import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useJobContext } from "@/context/JobContext";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Bookmark, Target, TrendingUp, Sparkles, Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PRESET_AVATARS = [
  "/avatars/avatar-1.png",
  "/avatars/avatar-2.png",
  "/avatars/avatar-3.png",
  "/avatars/avatar-4.png",
  "/avatars/avatar-5.png",
  "/avatars/avatar-6.png",
  "/avatars/avatar-7.png",
  "/avatars/avatar-8.png",
  "/avatars/avatar-9.png",
  "/avatars/avatar-10.png",
  "/avatars/avatar-11.png",
  "/avatars/avatar-12.png",
  "/avatars/avatar-13.png",
  "/avatars/avatar-14.png",
  "/avatars/avatar-15.png",
  "/avatars/avatar-16.png",
];

export function ProfileWelcomeBanner() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfileAsync } = useProfile();
  const { applications, savedJobs } = useJobContext();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.first_name, profile.last_name, profile.contact_email, profile.phone,
      profile.city, profile.linkedin_url, profile.current_title,
      profile.skills?.length ? "yes" : null,
      profile.resume_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  if (isLoading || !user) return null;

  const name = profile?.first_name || profile?.full_name || "there";
  const emojiAvatar = profile?.emoji_avatar as string | null;
  const avatarUrl = profile?.avatar_url as string | null;
  const initials = getInitials(profile?.full_name || profile?.first_name || user?.email || "");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) { console.error("Avatar upload error:", uploadError); throw uploadError; }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await updateProfileAsync({ avatar_url: publicUrl } as any);
      toast({ title: "Photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="col-span-full"
    >
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-accent/10 via-card to-card p-6 shadow-[0_4px_24px_hsl(var(--accent)/0.08)]">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
          {/* Large Avatar / Photo Card */}
          <div className="relative group flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-border/50 bg-secondary shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-secondary">
                  <span className="text-4xl sm:text-5xl">
                    {emojiAvatar || initials}
                  </span>
                </div>
              )}
            </div>
            {/* Name overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl px-3 py-2 pointer-events-none">
              <p className="text-white font-display font-bold text-sm truncate">{profile?.full_name || name}</p>
              {profile?.current_title && (
                <p className="text-white/70 text-[10px] truncate">{profile.current_title}</p>
              )}
            </div>
            {/* Camera overlay - opens avatar picker */}
            <input
              type="file"
              ref={photoInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(true); }}
              disabled={uploading}
              className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity shadow-md cursor-pointer"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Avatar Picker Dialog */}
          <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Choose your avatar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground font-medium">Pick a character</p>
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((url, i) => (
                    <motion.button
                      key={url}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        await updateProfileAsync({ avatar_url: url } as any);
                        toast({ title: "Avatar updated!" });
                        setShowAvatarPicker(false);
                      }}
                      className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        avatarUrl === url ? "border-accent shadow-[0_0_12px_hsl(var(--accent)/0.3)]" : "border-border/40 hover:border-accent/50"
                      }`}
                    >
                      <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover aspect-square" />
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  <button
                    onClick={() => { photoInputRef.current?.click(); setShowAvatarPicker(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-border/50 text-sm font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Upload photo
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={async () => {
                        await updateProfileAsync({ avatar_url: null } as any);
                        toast({ title: "Avatar removed" });
                        setShowAvatarPicker(false);
                      }}
                      className="px-4 py-2.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Right side: Welcome + Stats */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1">
              Welcome back, {name}!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Here's your job search overview</p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Briefcase, value: applications?.length || 0, label: "Applied", color: "text-accent" },
                { icon: Bookmark, value: savedJobs?.length || 0, label: "Saved", color: "text-amber-500" },
                { icon: Target, value: `${profileCompletion}%`, label: "Profile", color: "text-success" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="font-display font-bold text-lg text-foreground">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profile completion ring */}
        <div className="absolute top-6 right-6 z-10">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${profileCompletion} ${100 - profileCompletion}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-accent rotate-90">
            {profileCompletion}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || "?").toUpperCase();
}

export function SkillsCloudWidget({ className }: { className?: string }) {
  const { profile } = useProfile();
  const skills = profile?.skills || [];

  if (skills.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`rounded-3xl border border-border/40 bg-card p-5 shadow-card ${className || ""}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="font-display font-semibold text-sm text-foreground">Top Skills</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {skills.length > 20 ? `Showing 20 of ${skills.length}` : `${skills.length} skills`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.slice(0, 20).map((skill, i) => (
          <motion.span
            key={skill}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            {skill}
          </motion.span>
        ))}
        {skills.length > 20 && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            +{skills.length - 20} more
          </span>
        )}
      </div>
    </motion.div>
  );
}
