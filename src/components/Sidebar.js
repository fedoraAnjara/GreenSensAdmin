"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Users,
  Tractor,
  Map,
  Mail,
  BarChart2,
  LogOut,
  MessageSquare,
  Shield,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { href: "/dashboard", label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: "/dashboard/utilisateurs", label: t.sidebar.users, icon: Users },
    { href: "/dashboard/agriculteurs", label: t.sidebar.farmers, icon: Tractor },
    { href: "/dashboard/carte", label: t.sidebar.map, icon: Map },
    { href: "/dashboard/emails", label: t.sidebar.emails, icon: Mail },
    { href: "/dashboard/publications", label: t.sidebar.publications, icon: MessageSquare },
    { href: "/dashboard/statistiques", label: t.sidebar.statistics, icon: BarChart2 },
    { href: "/dashboard/admins", label: t.sidebar.admins, icon: Shield },
  ];

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">

      {/* Logo */}
      <img
        src="/images/GreenSenseLogo.png"
        alt="Logo GreenSense"
        className="h-24 w-auto"
      />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive
                  ? "bg-green-50 text-green-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition w-full"
        >
          <LogOut size={18} />
          {t.sidebar.logout}
        </button>
      </div>

    </aside>
  );
}