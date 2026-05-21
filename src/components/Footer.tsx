import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/50 py-10 mt-auto backdrop-blur-sm">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Sociax logo" className="h-8 w-8 rounded-xl" />
            <span className="font-display font-semibold text-sm text-foreground">Sociax.tech</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Sociax.tech. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
