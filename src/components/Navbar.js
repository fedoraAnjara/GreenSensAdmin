"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { user } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">

      <div />

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLanguage}
          className="text-sm text-gray-500 hover:text-green-600 font-medium transition"
        >
          {language === "fr" ? "English" : "Français"}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold">
            A
          </div>
          <span className="text-sm text-gray-700 font-medium">
            {t.navbar.admin}
          </span>
        </div>
      </div>

    </header>
  );
}