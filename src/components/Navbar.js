"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { user } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder={t.navbar.placeholder}
          className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
        />
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">

        {/* Toggle langue */}
        <button
          onClick={toggleLanguage}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-green-500 hover:text-green-600 transition"
        >
          {language === "fr" ? "EN" : "FR"}
        </button>

        {/* Notifs */}
        <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:border-green-500 hover:text-green-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* User */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-green-600 transition">
              {user?.displayName || t.navbar.admin}
            </p>
            <p className="text-xs text-gray-400">Administrateur</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-green-600 transition">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

      </div>
    </header>
  );
}