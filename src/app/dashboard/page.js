"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Users, Tractor, ShoppingBasket, Salad } from "lucide-react";
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
        // Stats utilisateurs
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "consommateur"))
        );
        const farmersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "agriculteur"))
        );
        const productsSnap = await getDocs(collection(db, "produits"));
        const recommSnap = await getDocs(collection(db, "recommandations"));

        setStats({
          totalUsers: usersSnap.size,
          totalFarmers: farmersSnap.size,
          totalProducts: productsSnap.size,
          totalRecommendations: recommSnap.size,
        });

        // Derniers utilisateurs
        const recentUsersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "consommateur"),
            orderBy("createdAt", "desc"),
            limit(5)
          )
        );
        setRecentUsers(recentUsersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        // Derniers agriculteurs
        const recentFarmersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "agriculteur"),
            orderBy("createdAt", "desc"),
            limit(5)
          )
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
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    {
      label: t.dashboard.stats.totalFarmers,
      value: stats.totalFarmers,
      icon: Tractor,
      color: "bg-green-50 text-green-600",
      border: "border-green-100",
    },
    {
      label: t.dashboard.stats.totalProducts,
      value: stats.totalProducts,
      icon: ShoppingBasket,
      color: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
    {
      label: t.dashboard.stats.totalRecommendations,
      value: stats.totalRecommendations,
      icon: Salad,
      color: "bg-purple-50 text-purple-600",
      border: "border-purple-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-600 font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t.dashboard.title}</h2>
        <p className="text-gray-500 mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, color, border }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl border ${border} p-5 flex items-center gap-4 shadow-sm`}
          >
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableaux récents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Derniers utilisateurs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{t.dashboard.recentUsers}</h3>
            <Link
              href="/dashboard/utilisateurs"
              className="text-sm text-green-600 hover:underline"
            >
              {t.dashboard.viewAll}
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-400">{t.dashboard.noData}</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    {user.nom?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.nom || "—"}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derniers agriculteurs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{t.dashboard.recentFarmers}</h3>
            <Link
              href="/dashboard/agriculteurs"
              className="text-sm text-green-600 hover:underline"
            >
              {t.dashboard.viewAll}
            </Link>
          </div>

          {recentFarmers.length === 0 ? (
            <p className="text-sm text-gray-400">{t.dashboard.noData}</p>
          ) : (
            <div className="space-y-3">
              {recentFarmers.map((farmer) => (
                <div key={farmer.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-semibold">
                    {farmer.nom?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{farmer.nom || "—"}</p>
                    <p className="text-xs text-gray-400">{farmer.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}