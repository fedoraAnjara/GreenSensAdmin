"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function DashboardPage() {
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFarmers: 0,
    totalProducts: 0,
    totalRecommendations: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentFarmers, setRecentFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "consommateur")));
        const farmersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "agriculteur")));
        const productsSnap = await getDocs(collection(db, "produits"));
        const recommSnap = await getDocs(collection(db, "recommandations"));

        setStats({
          totalUsers: usersSnap.size,
          totalFarmers: farmersSnap.size,
          totalProducts: productsSnap.size,
          totalRecommendations: recommSnap.size,
        });

        const recentUsersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "consommateur"), orderBy("createdAt", "desc"), limit(5))
        );
        setRecentUsers(recentUsersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const recentFarmersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "agriculteur"), orderBy("createdAt", "desc"), limit(5))
        );
        setRecentFarmers(recentFarmersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erreur chargement dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      label: t.dashboard.stats.totalUsers,
      value: stats.totalUsers,
      delta: "+12 ce mois",
      accent: "bg-blue-500",
      iconColor: "text-blue-500",
      deltaStyle: "bg-blue-50 text-blue-700",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: t.dashboard.stats.totalFarmers,
      value: stats.totalFarmers,
      delta: "+5 ce mois",
      accent: "bg-green-500",
      iconColor: "text-green-600",
      deltaStyle: "bg-green-50 text-green-700",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: t.dashboard.stats.totalProducts,
      value: stats.totalProducts,
      delta: "+34 ce mois",
      accent: "bg-amber-500",
      iconColor: "text-amber-600",
      deltaStyle: "bg-amber-50 text-amber-700",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      ),
    },
    {
      label: t.dashboard.stats.totalRecommendations,
      value: stats.totalRecommendations,
      delta: "+211 ce mois",
      accent: "bg-purple-500",
      iconColor: "text-purple-600",
      deltaStyle: "bg-purple-50 text-purple-700",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/>
          <path d="M18 2v4h4"/>
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-600 font-medium animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-1">
            GreenSense Admin
          </p>
          <h2 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Données en direct
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, delta, accent, iconColor, deltaStyle, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`h-1 w-full ${accent}`} />
            <div className="p-5">
              <div className={`mb-3 ${iconColor}`}>{icon}</div>
              <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-medium mt-3 px-2.5 py-1 rounded-full ${deltaStyle}`}>
                ↑ {delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Derniers utilisateurs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t.dashboard.recentUsers}
            </h3>
            <Link href="/dashboard/utilisateurs" className="text-xs text-green-600 hover:underline flex items-center gap-1">
              Voir tout →
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">{t.dashboard.noData}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {user.nom?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{user.nom || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
                    Consommateur
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derniers agriculteurs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t.dashboard.recentFarmers}
            </h3>
            <Link href="/dashboard/agriculteurs" className="text-xs text-green-600 hover:underline flex items-center gap-1">
              Voir tout →
            </Link>
          </div>

          {recentFarmers.length === 0 ? (
            <p className="text-sm text-gray-400 p-5">{t.dashboard.noData}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentFarmers.map((farmer) => (
                <div key={farmer.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {farmer.nom?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{farmer.nom || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{farmer.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 flex-shrink-0">
                    Agriculteur
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}