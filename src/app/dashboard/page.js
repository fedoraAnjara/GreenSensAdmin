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
    totalPoints: 0,
    totalPublications: 0,
  });

  const [pubStats, setPubStats] = useState({ total: 0, approved: 0, pending: 0, likes: 0 });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentFarmers, setRecentFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "consommateur")));
        const farmersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "agriculteur")));
        const pointsSnap = await getDocs(collection(db, "pointsDeVente"));
        const pubSnap = await getDocs(collection(db, "publications"));

        const pubs = pubSnap.docs.map((d) => d.data());

        setStats({
          totalUsers: usersSnap.size,
          totalFarmers: farmersSnap.size,
          totalPoints: pointsSnap.size,
          totalPublications: pubSnap.size,
        });

        setPubStats({
          total: pubs.length,
          approved: pubs.filter((p) => p.statut === "approuve").length,
          pending: pubs.filter((p) => p.statut === "en_attente").length,
          likes: pubs.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
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
      accent: "bg-blue-500",
      iconColor: "text-blue-500",
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
      accent: "bg-green-500",
      iconColor: "text-green-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: t.dashboard.stats.totalPoints || "Points de vente",
      value: stats.totalPoints,
      accent: "bg-amber-500",
      iconColor: "text-amber-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
    },
    {
      label: t.dashboard.stats.totalPublications || "Publications",
      value: stats.totalPublications,
      accent: "bg-purple-500",
      iconColor: "text-purple-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
        {statCards.map(({ label, value, accent, iconColor, icon }) => {
          const total =
            stats.totalUsers + stats.totalFarmers + stats.totalPoints + stats.totalPublications;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`h-1 w-full ${accent}`} />
              <div className="p-5">
                <div className={`mb-3 ${iconColor}`}>{icon}</div>
                <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Part du total</span>
                    <span className="text-xs font-semibold text-gray-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${accent} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Aperçu Statistiques */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Aperçu des publications
          </h3>
          <Link href="/dashboard/statistiques" className="text-xs text-green-600 hover:underline flex items-center gap-1">
            Statistiques détaillées →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-50">
          <div className="p-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{pubStats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Publications</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-2xl font-bold text-emerald-600">{pubStats.approved}</p>
            <p className="text-xs text-gray-500 mt-1">Approuvées</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-2xl font-bold text-amber-600">{pubStats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">En attente</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-2xl font-bold text-red-500">{pubStats.likes}</p>
            <p className="text-xs text-gray-500 mt-1">J'aime au total</p>
          </div>
        </div>
      </div>

    </div>
  );
}