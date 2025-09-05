import { FC } from "react";
import { useRouter } from "next/router";
import NetworkSwitcher from "./NetworkSwitcher";
import { useAdminStatus } from "../hooks/useAdminStatus";

export const Nav: FC = () => {
  const { pathname } = useRouter();
  const isAdmin = useAdminStatus();

  return (
    <nav className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 bg-neutral-950/90 border-b border-neutral-800/60">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
        {/* Left: Logo */}
        <a href="/" className="font-semibold text-white hover:text-neutral-300 transition-colors">
          Sol Meme Gen
        </a>
        
        {/* Navigation Links */}
        <a 
          href="/pricing" 
          data-active={pathname === "/pricing"} 
          className="nav-link"
        >
          Pricing
        </a>
        <a 
          href="/trust" 
          data-active={pathname === "/trust"} 
          className="nav-link"
        >
          Trust
        </a>
        
        {/* Right: Network Switcher and Admin */}
        <div className="ml-auto flex items-center gap-3">
          <NetworkSwitcher />
          {/* Admin login link - only shown to admin wallets */}
          {isAdmin && (
            <a 
              className="nav-link text-xs text-neutral-500 hover:text-neutral-300" 
              href="/admin/login"
            >
              Admin
            </a>
          )}
        </div>
      </div>
    </nav>
  );
};
