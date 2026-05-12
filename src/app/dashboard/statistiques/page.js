"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Users, Tractor, ShoppingBasket, Salad, MapPin, Mail } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function StatistiquesPage() {
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFarmers: 0,
    totalProducts: 0,
    totalRecommendations: 0,
    totalPoints: 0,
    emailsSent: 0,
  });

  const [usersByMonth, setUsersByMonth] = useState([]);
  const [usersByRole, setUsersByRole] = useState([]);
  const [farmersByStatus, setFarmersByStatus] = useState([]);
  const [pointsByType, setPointsByType] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = {
    green: "#16a34a",
    blue: "#2563eb",
    amber: "#d97706",
    red: "#dc2626",
    purple: "#7c3aed",
    teal: "#0d9488",
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Collections
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "consommateur"))
        );
        const farmersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "agriculteur"))
        );
        const productsSnap = await getDocs(collection(db, "produits"));
        const recommSnap = await getDocs(collection(db, "recommandations"));
        const pointsSnap = await getDocs(collection(db, "pointsDeVente"));
        const emailsSnap = await getDocs(collection(db, "emailHistory"));

        // Stats globales
        setStats({
          totalUsers: usersSnap.size,
          totalFarmers: farmersSnap.size,
          totalProducts: productsSnap.size,
          totalRecommendations: recommSnap.size,
          totalPoints: pointsSnap.size,
          emailsSent: emailsSnap.size,
        });

        // Inscriptions par mois (utilisateurs + agriculteurs)
        const allUsers = [
          ...usersSnap.docs.map((d) => d.data()),
          ...farmersSnap.docs.map((d) => d.data()),
        ];
        const monthKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        const monthCounts = Array(12).fill(0);
        allUsers.forEach((u) => {
          if (u.createdAt) {
            const date = u.createdAt.toDate?.() ?? new Date(u.createdAt);
            monthCounts[date.getMonth()]++;
          }
        });
        setUsersByMonth(
          monthKeys.map((key, i) => ({
            month: t.statistics.months[key],
            inscriptions: monthCounts[i],
          }))
        );

        // Répartition par rôle
        setUsersByRole([
          { name: t.statistics.roles.consommateur, value: usersSnap.size, color: COLORS.blue },
          { name: t.statistics.roles.agriculteur, value: farmersSnap.size, color: COLORS.green },
        ]);

        // Agriculteurs par statut
        const farmers = farmersSnap.docs.map((d) => d.data());
        const approved = farmers.filter((f) => f.farmerStatus === "approved").length;
        const pending = farmers.filter((f) => !f.farmerStatus || f.farmerStatus === "pending").length;
        const suspended = farmers.filter((f) => f.farmerStatus === "suspended").length;
        setFarmersByStatus([
          { name: t.statistics.farmerStatus.approved, value: approved, color: COLORS.green },
          { name: t.statistics.farmerStatus.pending, value: pending, color: COLORS.amber },
          { name: t.statistics.farmerStatus.suspended, value: suspended, color: COLORS.red },
        ]);

        // Points par type
        const points = pointsSnap.docs.map((d) => d.data());
        const vente = points.filter((p) => p.type === "vente").length;
        const cultivation = points.filter((p) => p.type === "cultivation").length;
        const elevage = points.filter((p) => p.type === "elevage").length;
        setPointsByType([
          { name: t.statistics.pointTypes.vente, value: vente, color: COLORS.green },
          { name: t.statistics.pointTypes.cultivation, value: cultivation, color: COLORS.amber },
          { name: t.statistics.pointTypes.elevage, value: elevage, color: COLORS.blue },
        ]);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: t.statistics.cards.totalUsers, value: stats.totalUsers, icon: Users, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
    { label: t.statistics.cards.totalFarmers, value: stats.totalFarmers, icon: Tractor, color: "bg-green-50 text-green-600", border: "border-green-100" },
    { label: t.statistics.cards.totalProducts, value: stats.totalProducts, icon: ShoppingBasket, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
    { label: t.statistics.cards.totalRecommendations, value: stats.totalRecommendations, icon: Salad, color: "bg-purple-50 text-purple-600", border: "border-purple-100" },
    { label: t.statistics.cards.totalPoints, value: stats.totalPoints, icon: MapPin, color: "bg-teal-50 text-teal-600", border: "border-teal-100" },
    { label: t.statistics.cards.emailsSent, value: stats.emailsSent, icon: Mail, color: "bg-red-50 text-red-600", border: "border-red-100" },
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
        <h2 className="text-2xl font-bold text-gray-800">{t.statistics.title}</h2>
        <p className="text-gray-500 mt-1">{t.statistics.subtitle}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, border }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl border ${border} p-5 flex items-center gap-4 shadow-sm`}
          >
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Inscriptions par mois */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t.statistics.charts.usersByMonth}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usersByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="inscriptions" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par rôle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t.statistics.charts.usersByRole}</h3>
          {stats.totalUsers + stats.totalFarmers === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{t.statistics.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {usersByRole.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Agriculteurs par statut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t.statistics.charts.farmersByStatus}</h3>
          {stats.totalFarmers === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{t.statistics.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={farmersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {farmersByStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Points par type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{t.statistics.charts.pointsByType}</h3>
          {stats.totalPoints === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{t.statistics.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pointsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pointsByType.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}