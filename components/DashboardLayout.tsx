"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  BarChart3,
  Users,
  FileText,
  Building2,
  Boxes,
  Truck,
  Shield,
  ClipboardCheck,
  Activity,
  FileCheck,
  Search,
  Package,
  ShieldCheck,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { UserRole } from "@/lib/types/user";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName?: string | null;
}

export default function DashboardLayout({ children, userRole, userName }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await auth.signOut();
      }
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getNavItems = () => {
    const commonItems = [
      { label: "Dashboard", icon: <Home className="h-5 w-5" />, href: "/dashboard" },
      { label: "Analytics", icon: <BarChart3 className="h-5 w-5" />, href: "/analytics" },
      { label: "Settings", icon: <Settings className="h-5 w-5" />, href: "/settings" },
    ];

    interface NavItem {
      label: string;
      icon: React.ReactNode;
      href: string;
    }
    const roleSpecificItems: Record<UserRole, NavItem[]> = {
      admin: [
        { label: "Registration Requests", icon: <FileText className="h-5 w-5" />, href: "/admin/registration-requests" },
        { label: "User Management", icon: <Users className="h-5 w-5" />, href: "/admin/users" },
        { label: "Suppliers", icon: <Building2 className="h-5 w-5" />, href: "/suppliers" },
        { label: "Products", icon: <Boxes className="h-5 w-5" />, href: "/products" },
        { label: "Shipments", icon: <Truck className="h-5 w-5" />, href: "/movements" },
        { label: "Verifications", icon: <Shield className="h-5 w-5" />, href: "/verifications" },
        { label: "QC Logs", icon: <ClipboardCheck className="h-5 w-5" />, href: "/qc-logs" },
        { label: "Blockchain", icon: <Activity className="h-5 w-5" />, href: "/blockchain" },
        { label: "Reports", icon: <FileCheck className="h-5 w-5" />, href: "/reports" },
      ],
      sme: [
        { label: "Products", icon: <Package className="h-5 w-5" />, href: "/products" },
        { label: "New Product", icon: <Boxes className="h-5 w-5" />, href: "/products/new" },
        { label: "Shipments", icon: <Truck className="h-5 w-5" />, href: "/movements" },
        { label: "Verifications", icon: <Shield className="h-5 w-5" />, href: "/verifications" },
      ],
      supplier: [
        { label: "Products", icon: <Package className="h-5 w-5" />, href: "/products" },
        { label: "New Product", icon: <Boxes className="h-5 w-5" />, href: "/products/new" },
        { label: "Shipments", icon: <Truck className="h-5 w-5" />, href: "/movements" },
        { label: "Verifications", icon: <Shield className="h-5 w-5" />, href: "/verifications" },
      ],
      warehouse: [
        { label: "Inbound", icon: <Truck className="h-5 w-5" />, href: "/movements?type=inbound" },
        { label: "Outbound", icon: <Package className="h-5 w-5" />, href: "/movements?type=outbound" },
        { label: "All Movements", icon: <Activity className="h-5 w-5" />, href: "/movements" },
        { label: "QC Logs", icon: <ClipboardCheck className="h-5 w-5" />, href: "/qc-logs" },
      ],
      auditor: [
        { label: "Verifications", icon: <Shield className="h-5 w-5" />, href: "/verifications" },
        { label: "Reports", icon: <FileCheck className="h-5 w-5" />, href: "/reports" },
        { label: "Products", icon: <Search className="h-5 w-5" />, href: "/products" },
        { label: "Blockchain", icon: <Activity className="h-5 w-5" />, href: "/blockchain" },
      ],
    };

    return [...commonItems.slice(0, 1), ...(roleSpecificItems[userRole] || []), ...commonItems.slice(1)];
  };

  const navItems = getNavItems();

  return (
    <div className="h-screen flex bg-black relative overflow-hidden">
      {/* Background gradient effect - Matching Dashboard */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-black pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 max-h-screen overflow-hidden relative z-10">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
              <div className="relative bg-primary/10 rounded-lg p-2.5 group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-105">
                <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                OriginX
              </span>
              <span className="text-xs text-gray-400 font-medium">
                Anti‑Counterfeit Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          <div className="space-y-2">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
              >
                <div className="group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          {/* Keyboard Shortcuts Help */}
          <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-xs font-semibold text-gray-400 mb-2">Keyboard Shortcuts</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Refresh</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+R</kbd>
              </div>
              <div className="flex justify-between">
                <span>Export</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+E</kbd>
              </div>
              <div className="flex justify-between">
                <span>Filter</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+F</kbd>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 z-50 lg:hidden flex flex-col max-h-screen overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-3 group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
                    <div className="relative bg-primary/10 rounded-lg p-2.5 group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-105">
                      <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                      OriginX
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Anti‑Counterfeit Platform
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
              <div className="space-y-2">
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </nav>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-800">
              {/* Keyboard Shortcuts Help */}
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <p className="text-xs font-semibold text-gray-400 mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Refresh</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Export</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+E</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Filter</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">Ctrl+F</kbd>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-4 p-4 bg-gray-900 border-b border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:bg-gray-800"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link
            href="/"
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
              <div className="relative bg-primary/10 rounded-lg p-2 group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-105">
                <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                OriginX
              </span>
              {userName && <p className="text-gray-400 text-xs">{userName}</p>}
            </div>
          </Link>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

