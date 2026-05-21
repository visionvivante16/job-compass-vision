import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function Layout({ children, showHeader = true, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col dashboard-gradient">
      {showHeader && <Header />}
      <main className="flex-1 content-glow relative">
        <div className="relative z-10">
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
