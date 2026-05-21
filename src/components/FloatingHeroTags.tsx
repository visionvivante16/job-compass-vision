import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

const tags = [
  "React Developer", "UI/UX Designer", "Product Manager", "Data Analyst",
  "DevOps", "Full Stack", "Mobile Developer", "AI Engineer",
  "Blockchain", "Cyber Security",
];

const desktopPositions: { x: number; y: number }[] = [
  { x: 5, y: 18 }, { x: 82, y: 15 }, { x: 6, y: 72 }, { x: 86, y: 75 },
  { x: 3, y: 45 }, { x: 93, y: 45 }, { x: 20, y: 25 }, { x: 78, y: 28 },
  { x: 12, y: 82 }, { x: 82, y: 60 },
];

const driftKeyframes = [
  "floatDrift1", "floatDrift2", "floatDrift3", "floatDrift4", "floatDrift5",
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function FloatingHeroTags() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const currentOffsets = useRef(tags.map(() => ({ x: 0, y: 0 })));
  const rafRef = useRef<number>(0);

  const handleClick = useCallback((tag: string) => {
    if (user) {
      navigate(`/dashboard?search=${encodeURIComponent(tag)}`);
    } else {
      sessionStorage.setItem("pending_search", tag);
      navigate("/auth");
    }
  }, [navigate, user]);

  // Direct DOM rAF loop with lerp — no React state, no re-renders
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);

    const LERP_FACTOR = 0.06; // smooth ease
    const MAX_DIST = 220;
    const STRENGTH = 40;

    const tick = () => {
      const rect = container.getBoundingClientRect();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < tags.length; i++) {
        const el = tagRefs.current[i];
        const pos = desktopPositions[i];
        if (!el || !pos) continue;

        const tagX = (pos.x / 100) * rect.width;
        const tagY = (pos.y / 100) * rect.height;
        const dx = tagX - mx;
        const dy = tagY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = 0;
        let targetY = 0;

        if (dist < MAX_DIST && dist > 0) {
          const force = ((MAX_DIST - dist) / MAX_DIST) * STRENGTH;
          targetX = (dx / dist) * force;
          targetY = (dy / dist) * force;
        }

        const cur = currentOffsets.current[i];
        cur.x = lerp(cur.x, targetX, LERP_FACTOR);
        cur.y = lerp(cur.y, targetY, LERP_FACTOR);

        // Snap tiny values to zero to avoid jitter
        if (Math.abs(cur.x) < 0.05) cur.x = 0;
        if (Math.abs(cur.y) < 0.05) cur.y = 0;

        el.style.translate = `${cur.x}px ${cur.y}px`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile]);

  // Mobile: horizontal scroll row
  if (isMobile) {
    const mobileTags = tags.slice(0, 8);
    return (
      <div className="w-full overflow-x-auto scrollbar-hide mt-6 -mb-2">
        <div className="flex gap-2 px-4 pb-2 w-max">
          {mobileTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleClick(tag)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-medium
                bg-card/60 backdrop-blur-sm border border-border/40
                text-foreground/80 hover:border-accent hover:text-accent
                active:scale-95 transition-all duration-200"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[11] pointer-events-none"
      aria-hidden="true"
    >
      {tags.map((tag, i) => {
        const pos = desktopPositions[i];
        if (!pos) return null;
        const driftClass = driftKeyframes[i % driftKeyframes.length];
        const duration = 6 + (i % 5) * 2;
        const delay = -(i * 0.7);

        return (
          <button
            key={tag}
            ref={(el) => { tagRefs.current[i] = el; }}
            onClick={() => handleClick(tag)}
            className="absolute pointer-events-auto
              px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap
              bg-card/80 dark:bg-[hsl(0_0%_100%/0.06)]
              text-foreground/70 border border-transparent backdrop-blur-md
              hover:border-accent hover:text-accent hover:scale-110
              hover:shadow-[0_0_16px_hsl(var(--accent)/0.3)]
              active:scale-95
              transition-[border,color,box-shadow,scale] duration-200 ease-out
              cursor-pointer select-none will-change-[translate]"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              animation: `${driftClass} ${duration}s ease-in-out ${delay}s infinite`,
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
