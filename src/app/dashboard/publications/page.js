"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Check, X, MessageSquare, Clock, Archive, RotateCcw, Undo2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function PublicationsPage() {
  const { t } = useLanguage();
  const [publications, setPublications] = useState([]);
  const [filter, setFilter] = useState("en_attente");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("recent");

  // Modale de confirmation
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);

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
      toast.error(t.publications.error);
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
      toast.error(t.publications.error);
    }
  };

  // Marquer une annonce comme périmée (reste visible en historique côté consommateur)
  const handleExpire = async (id) => {
    try {
      await updateDoc(doc(db, "publications", id), {
        statut: "perime",
        expiredAt: serverTimestamp(),
      });
      toast.success(t.publications.expireSuccess);
      fetchPublications();
    } catch (e) {
      toast.error(t.publications.error);
    }
  };

  // Remettre une annonce périmée en circulation
  const handleRestore = async (id) => {
    try {
      await updateDoc(doc(db, "publications", id), {
        statut: "approuve",
        approvedAt: serverTimestamp(),
      });
      toast.success(t.publications.restoreSuccess);
      fetchPublications();
    } catch (e) {
      toast.error(t.publications.error);
    }
  };

  // Annuler une décision : l'annonce retourne dans la file d'attente
  const confirmRevert = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await updateDoc(doc(db, "publications", confirmTarget.id), {
        statut: "en_attente",
        revertedAt: serverTimestamp(),
      });
      toast.success(t.publications.revertSuccess);
      setConfirmTarget(null);
      fetchPublications();
    } catch (e) {
      toast.error(t.publications.error);
    } finally {
      setConfirming(false);
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

  const daysSince = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return Math.floor((Date.now() - date.getTime()) / 86400000);
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

  const getCardStyle = (statut) => {
    switch (statut) {
      case "perime":
        return "bg-gray-50 border-gray-300 opacity-75";
      case "rejete":
        return "bg-white border-red-100";
      case "approuve":
        return "bg-white border-green-100";
      default:
        return "bg-white border-amber-200 ring-1 ring-amber-100";
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case "approuve": return t.publications.approved;
      case "perime": return t.publications.expired;
      case "rejete": return t.publications.rejected;
      default: return t.publications.pending;
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
        <div className="text-green-600 font-medium">
          {t.common?.loading || "Chargement..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 flex-wrap">
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
        {["en_attente", "approuve", "perime", "rejete", "all"].map((f) => (
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
             f === "perime" ? `🗄️ ${t.publications.expired}` :
             f === "rejete" ? `❌ ${t.publications.rejected}` :
             `🗂️ ${t.publications.all}`}
          </button>
        ))}
      </div>

      {/* Tri */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">{t.publications.sortBy}</span>
        <button
          onClick={() => setSortOrder("recent")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
            ${sortOrder === "recent"
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
        >
          ↓ {t.publications.newest}
        </button>
        <button
          onClick={() => setSortOrder("ancien")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
            ${sortOrder === "ancien"
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
        >
          ↑ {t.publications.oldest}
        </button>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          {t.publications.noData}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pub) => {
            const age = daysSince(pub.createdAt);
            const isOld = pub.statut === "approuve" && age !== null && age >= 7;
            const isExpired = pub.statut === "perime";

            return (
              <div
                key={pub.id}
                className={`rounded-2xl border shadow-sm p-5 transition ${getCardStyle(pub.statut)}`}
              >

                {/* Header carte */}
                <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                      ${isExpired ? "bg-gray-200 text-gray-500" : "bg-green-100 text-green-600"}`}>
                      {pub.agriculteurNom?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div>
                      <p className={`font-semibold ${isExpired ? "text-gray-500" : "text-gray-800"}`}>
                        {pub.agriculteurNom}
                      </p>
                      <p className="text-xs text-gray-400">
                        📱 {pub.telephone} · {formatDate(pub.createdAt)}
                        {age !== null && age > 0 && (
                          <span className={isOld ? "text-amber-600 font-medium" : ""}>
                            {" "}· {t.publications.daysAgo.replace("{n}", age)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                    {pub.statut === "perime" && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                        <Archive size={10} /> {t.publications.expired}
                      </span>
                    )}
                    {pub.statut === "rejete" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        ❌ {t.publications.rejected}
                      </span>
                    )}
                  </div>
                </div>

                {/* Alerte annonce ancienne */}
                {isOld && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                    <Clock size={14} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">{t.publications.oldWarning}</p>
                  </div>
                )}

                {/* SMS original */}
                <div className={`rounded-xl p-3 mb-4 ${isExpired ? "bg-gray-100" : "bg-gray-50"}`}>
                  <p className="text-xs text-gray-400 mb-1 font-medium">{t.publications.originalSms}</p>
                  <p className="text-sm text-gray-700 italic">"{pub.messageOriginal}"</p>
                </div>

                {/* Infos extraites */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2 font-medium">{t.publications.extractedInfo}</p>
                  <p className={`text-sm font-medium mb-2 ${isExpired ? "text-gray-500" : "text-gray-800"}`}>
                    {pub.contenu}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {pub.produit && (
                      <div className={`rounded-lg p-2 ${isExpired ? "bg-gray-100" : "bg-green-50"}`}>
                        <p className="text-xs text-gray-400">{t.publications.product}</p>
                        <p className="text-sm font-medium text-gray-800">{pub.produit}</p>
                      </div>
                    )}
                    {pub.quantite && (
                      <div className={`rounded-lg p-2 ${isExpired ? "bg-gray-100" : "bg-blue-50"}`}>
                        <p className="text-xs text-gray-400">{t.publications.quantity}</p>
                        <p className="text-sm font-medium text-gray-800">{pub.quantite}</p>
                      </div>
                    )}
                    {pub.prix && (
                      <div className={`rounded-lg p-2 ${isExpired ? "bg-gray-100" : "bg-amber-50"}`}>
                        <p className="text-xs text-gray-400">{t.publications.price}</p>
                        <p className="text-sm font-medium text-gray-800">{pub.prix.toLocaleString()} Ar</p>
                      </div>
                    )}
                    {pub.localisation && (
                      <div className={`rounded-lg p-2 ${isExpired ? "bg-gray-100" : "bg-purple-50"}`}>
                        <p className="text-xs text-gray-400">{t.publications.location}</p>
                        <p className="text-sm font-medium text-gray-800">{pub.localisation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions — en attente */}
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

                {/* Actions — approuvée */}
                {pub.statut === "approuve" && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                    <button
                      onClick={() => handleExpire(pub.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      <Archive size={16} />
                      {t.publications.markExpired}
                    </button>
                    <button
                      onClick={() => setConfirmTarget(pub)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                    >
                      <Undo2 size={16} />
                      {t.publications.revert}
                    </button>
                  </div>
                )}

                {/* Actions — périmée */}
                {pub.statut === "perime" && (
                  <div className="flex gap-2 pt-3 border-t border-gray-200 flex-wrap">
                    <button
                      onClick={() => handleRestore(pub.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition"
                    >
                      <RotateCcw size={16} />
                      {t.publications.restore}
                    </button>
                    <button
                      onClick={() => setConfirmTarget(pub)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                    >
                      <Undo2 size={16} />
                      {t.publications.revert}
                    </button>
                  </div>
                )}

                {/* Actions — rejetée */}
                {pub.statut === "rejete" && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">{t.publications.revertHint}</p>
                    <button
                      onClick={() => setConfirmTarget(pub)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                    >
                      <Undo2 size={16} />
                      {t.publications.revert}
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modale de confirmation */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !confirming && setConfirmTarget(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {t.publications.revertModalTitle}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    {t.publications.revertModalMessage}
                  </p>
                </div>
              </div>

              {/* Rappel de l'annonce concernée */}
              <div className="bg-gray-50 rounded-xl p-3 mt-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {confirmTarget.produit || confirmTarget.contenu?.slice(0, 40) || "—"}
                  </p>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {getStatusLabel(confirmTarget.statut)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {confirmTarget.agriculteurNom} · {formatDate(confirmTarget.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={confirming}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                {t.publications.cancel}
              </button>
              <button
                onClick={confirmRevert}
                disabled={confirming}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Undo2 size={16} />
                {confirming ? t.publications.reverting : t.publications.confirmRevert}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}