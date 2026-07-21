"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { MessageSquare, CheckCircle, Clock, Heart, HeartPulse, Bot } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function StatistiquesPage() {
  const { t } = useLanguage();
  const ts = t.statistics;

  const [stats, setStats] = useState({
    totalPublications: 0,
    approved: 0,
    pending: 0,
    totalLikes: 0,
    healthProfiles: 0,
    conversations: 0,
  });

  const [pubsByMonth, setPubsByMonth] = useState([]);
  const [pubsByStatus, setPubsByStatus] = useState([]);
  const [pubsByType, setPubsByType] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
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
        // --- PUBLICATIONS ---
        const pubSnap = await getDocs(collection(db, "publications"));
        const pubs = pubSnap.docs.map((d) => d.data());

        const totalPublications = pubs.length;
        const approved = pubs.filter((p) => p.statut === "approuve").length;
        const pending = pubs.filter((p) => p.statut === "en_attente").length;
        const rejected = pubs.filter((p) => p.statut === "rejete").length;
        const totalLikes = pubs.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

        // Publications par mois
        const monthKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        const monthCounts = Array(12).fill(0);
        pubs.forEach((p) => {
          if (p.createdAt) {
            const date = p.createdAt.toDate?.() ?? new Date(p.createdAt);
            monthCounts[date.getMonth()]++;
          }
        });
        setPubsByMonth(
          monthKeys.map((key, i) => ({
            month: ts.months[key],
            publications: monthCounts[i],
          }))
        );

        // Publications par statut
        setPubsByStatus([
          { name: ts.status.approved, value: approved, color: COLORS.green },
          { name: ts.status.pending, value: pending, color: COLORS.amber },
          { name: ts.status.rejected, value: rejected, color: COLORS.red },
        ]);

        // Publications par type
        const typeKeys = ["vente", "atelier", "promotion", "stock", "autre"];
        const typeColors = [COLORS.green, COLORS.blue, COLORS.purple, COLORS.amber, COLORS.teal];
        setPubsByType(
          typeKeys.map((key, i) => ({
            name: ts.types[key],
            value: pubs.filter((p) => p.type === key).length,
            color: typeColors[i],
          })).filter((entry) => entry.value > 0)
        );

        // Top produits annoncés
        const productCounts = {};
        pubs.forEach((p) => {
          if (p.produit) {
            const key = p.produit.trim();
            if (key) productCounts[key] = (productCounts[key] || 0) + 1;
          }
        });
        const topProds = Object.entries(productCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopProducts(topProds);

        // --- ENGAGEMENT CONSOMMATEUR ---
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "consommateur"))
        );
        const consumers = usersSnap.docs;

        let healthProfiles = 0;
        let conversations = 0;
        await Promise.all(
          consumers.map(async (c) => {
            try {
              const hp = await getDoc(doc(db, "users", c.id, "profilSante", "data"));
              if (hp.exists()) healthProfiles++;
            } catch (e) {}
            try {
              const conv = await getDocs(collection(db, "users", c.id, "conversations"));
              conversations += conv.size;
            } catch (e) {}
          })
        );

        setStats({
          totalPublications,
          approved,
          pending,
          totalLikes,
          healthProfiles,
          conversations,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: ts.cards.totalPublications, value: stats.totalPublications, icon: MessageSquare, color: "bg-green-50 text-green-600", border: "border-green-100" },
    { label: ts.cards.approved, value: stats.approved, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
    { label: ts.cards.pending, value: stats.pending, icon: Clock, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
    { label: ts.cards.totalLikes, value: stats.totalLikes, icon: Heart, color: "bg-red-50 text-red-600", border: "border-red-100" },
    { label: ts.cards.healthProfiles, value: stats.healthProfiles, icon: HeartPulse, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
    { label: ts.cards.conversations, value: stats.conversations, icon: Bot, color: "bg-purple-50 text-purple-600", border: "border-purple-100" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-600 font-medium">{t.common?.loading || "Chargement..."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{ts.title}</h2>
        <p className="text-gray-500 mt-1">{ts.subtitle}</p>
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

        {/* Publications par mois */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{ts.charts.pubsByMonth}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pubsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="publications" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Publications par statut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{ts.charts.pubsByStatus}</h3>
          {stats.totalPublications === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{ts.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pubsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pubsByStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Publications par type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{ts.charts.pubsByType}</h3>
          {pubsByType.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{ts.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pubsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pubsByType.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top produits annoncés */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">{ts.charts.topProducts}</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">{ts.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}