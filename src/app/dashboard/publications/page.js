"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Check, X, MessageSquare, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function PublicationsPage() {
  const { t } = useLanguage();
  const [publications, setPublications] = useState([]);
  const [filter, setFilter] = useState("en_attente");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("recent");

const fetchPublications = async () => {
  try {
    const snap = await getDocs(collection(db, "publications"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPublications(data);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchPublications();
  }, []);

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, "publications", id), {
        statut: "approuve",
        approvedAt: serverTimestamp(),
      });
      toast.success(t.publications.approveSuccess);
      fetchPublications();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, "publications", id), {
        statut: "rejete",
        rejectedAt: serverTimestamp(),
      });
      toast.success(t.publications.rejectSuccess);
      fetchPublications();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case "vente": return "bg-green-100 text-green-700";
      case "atelier": return "bg-blue-100 text-blue-700";
      case "promotion": return "bg-amber-100 text-amber-700";
      case "stock": return "bg-red-100 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

const filtered = publications
  .filter((p) => (filter === "all" ? true : p.statut === filter))
  .sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() ?? new Date(0);
    const dateB = b.createdAt?.toDate?.() ?? new Date(0);
    return sortOrder === "recent" ? dateB - dateA : dateA - dateB;
  });

  const pendingCount = publications.filter((p) => p.statut === "en_attente").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-600 font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare size={22} />
          {t.publications.title}
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {pendingCount} {t.publications.pending.toLowerCase()}
            </span>
          )}
        </h2>
        <p className="text-gray-500 mt-1">{t.publications.subtitle}</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {["en_attente", "approuve", "rejete", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${filter === f
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {f === "en_attente" ? `⏳ ${t.publications.pending}` :
             f === "approuve" ? `✅ ${t.publications.approved}` :
             f === "rejete" ? `❌ ${t.publications.rejected}` :
             `🗂️ ${t.publications.all}`}
          </button>
        ))}
      </div>

      {/* Tri */}
        <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Trier par :</span>
        <button
            onClick={() => setSortOrder("recent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
            ${sortOrder === "recent"
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
        >
            ↓ Plus récents
        </button>
        <button
            onClick={() => setSortOrder("ancien")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
            ${sortOrder === "ancien"
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
        >
            ↑ Plus anciens
        </button>
        </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          {t.publications.noData}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pub) => (
            <div key={pub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

              {/* Header carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">
                    {pub.agriculteurNom?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{pub.agriculteurNom}</p>
                    <p className="text-xs text-gray-400">📱 {pub.telephone} · {formatDate(pub.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyle(pub.type)}`}>
                    {t.publications.type[pub.type] || pub.type}
                  </span>
                  {pub.statut === "en_attente" && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <Clock size={10} /> {t.publications.pending}
                    </span>
                  )}
                  {pub.statut === "approuve" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✅ {t.publications.approved}
                    </span>
                  )}
                  {pub.statut === "rejete" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                      ❌ {t.publications.rejected}
                    </span>
                  )}
                </div>
              </div>

              {/* SMS original */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1 font-medium">{t.publications.originalSms}</p>
                <p className="text-sm text-gray-700 italic">"{pub.messageOriginal}"</p>
              </div>

              {/* Infos extraites */}
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2 font-medium">{t.publications.extractedInfo}</p>
                <p className="text-sm font-medium text-gray-800 mb-2">{pub.contenu}</p>
                <div className="grid grid-cols-2 gap-2">
                  {pub.produit && (
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">{t.publications.product}</p>
                      <p className="text-sm font-medium text-gray-800">{pub.produit}</p>
                    </div>
                  )}
                  {pub.quantite && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">{t.publications.quantity}</p>
                      <p className="text-sm font-medium text-gray-800">{pub.quantite}</p>
                    </div>
                  )}
                  {pub.prix && (
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">{t.publications.price}</p>
                      <p className="text-sm font-medium text-gray-800">{pub.prix.toLocaleString()} Ar</p>
                    </div>
                  )}
                  {pub.localisation && (
                    <div className="bg-purple-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">{t.publications.location}</p>
                      <p className="text-sm font-medium text-gray-800">{pub.localisation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {pub.statut === "en_attente" && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(pub.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition"
                  >
                    <Check size={16} />
                    {t.publications.approve}
                  </button>
                  <button
                    onClick={() => handleReject(pub.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    <X size={16} />
                    {t.publications.reject}
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}