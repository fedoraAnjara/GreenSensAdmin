"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800">{t.dashboard.title}</h2>
      <p className="text-gray-500 mt-1">{t.dashboard.subtitle}</p>
    </div>
  );
}