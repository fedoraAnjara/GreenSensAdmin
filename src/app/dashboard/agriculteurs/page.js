"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Eye, Check, Ban, Trash2, Search, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AgriculteurPage() {
  const { t } = useLanguage();

  const [farmers, setFarmers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmInfo, setFarmInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchFarmers = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "agriculteur"))
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFarmers(data);
      setFiltered(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  // Recherche et filtre
  useEffect(() => {
    let result = [...farmers];
    if (filter !== "all") result = result.filter((f) => f.farmerStatus === filter);
    if (search.trim()) {
      result = result.filter(
        (f) =>
          f.nom?.toLowerCase().includes(search.toLowerCase()) ||
          f.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [search, filter, farmers]);

  const handleViewDetail = async (farmer) => {
    setSelectedFarmer(farmer);
    setFarmInfo(null);
    setModalLoading(true);
    try {
      const farmSnap = await getDoc(
        doc(db, "agriculteurs", farmer.id)
      );
      if (farmSnap.exists()) setFarmInfo(farmSnap.data());
    } catch (error) {
      console.error(error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedFarmer(null);
    setFarmInfo(null);
  };

  const handleUpdateStatus = async (farmer, newStatus) => {
    try {
      await updateDoc(doc(db, "users", farmer.id), { farmerStatus: newStatus });
      if (selectedFarmer?.id === farmer.id) {
        setSelectedFarmer((prev) => ({ ...prev, farmerStatus: newStatus }));
      }
      toast.success(
        newStatus === "approved" ? t.farmers.approveSuccess : t.farmers.suspendSuccess
      );
      fetchFarmers();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (farmerId) => {
    if (!confirm(t.farmers.actions.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "users", farmerId));
      toast.success(t.farmers.deleteSuccess);
      handleCloseModal();
      fetchFarmers();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleDateString("fr-FR");
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "suspended": return "bg-red-100 text-red-600";
      default: return "bg-amber-100 text-amber-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "approved": return t.farmers.status.approved;
      case "suspended": return t.farmers.status.suspended;
      default: return t.farmers.status.pending;
    }
  };

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
        <h2 className="text-2xl font-bold text-gray-800">{t.farmers.title}</h2>
        <p className="text-gray-500 mt-1">{t.farmers.subtitle}</p>
      </div>

      {/* Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.farmers.search}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved", "suspended"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${filter === f
                  ? "bg-green-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
            >
              {t.farmers.filter[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.farmers.noData}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.name}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.email}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.status}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.joinedAt}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((farmer) => (
                <tr key={farmer.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">
                        {farmer.nom?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <span className="font-medium text-gray-800">{farmer.nom || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{farmer.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(farmer.farmerStatus)}`}>
                      {getStatusLabel(farmer.farmerStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(farmer.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(farmer)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        title={t.farmers.actions.view}
                      >
                        <Eye size={16} />
                      </button>
                      {farmer.farmerStatus !== "approved" && (
                        <button
                          onClick={() => handleUpdateStatus(farmer, "approved")}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition"
                          title={t.farmers.actions.approve}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {farmer.farmerStatus !== "suspended" && (
                        <button
                          onClick={() => handleUpdateStatus(farmer, "suspended")}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                          title={t.farmers.actions.suspend}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(farmer.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                        title={t.farmers.actions.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal détails */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{t.farmers.detail.title}</h3>
              <button onClick={handleCloseModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Avatar + nom + statut */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl font-bold">
                  {selectedFarmer.nom?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-800">{selectedFarmer.nom || "—"}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(selectedFarmer.farmerStatus)}`}>
                    {getStatusLabel(selectedFarmer.farmerStatus)}
                  </span>
                </div>
              </div>

              {/* Infos personnelles */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.farmers.detail.personalInfo}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t.farmers.detail.email, value: selectedFarmer.email },
                    { label: t.farmers.detail.joinedAt, value: formatDate(selectedFarmer.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infos ferme */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.farmers.detail.farmInfo}
                </p>
                {modalLoading ? (
                  <div className="text-sm text-green-600">Chargement...</div>
                ) : !farmInfo ? (
                  <p className="text-sm text-gray-400">Aucune information de ferme renseignée</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t.farmers.detail.farmName, value: farmInfo.nomFerme },
                      { label: t.farmers.detail.address, value: farmInfo.adresse },
                      { label: t.farmers.detail.description, value: farmInfo.description || t.farmers.detail.noDescription },
                      { label: t.farmers.detail.certifications, value: farmInfo.certifications?.join(", ") || t.farmers.detail.noCertifications },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {selectedFarmer.farmerStatus !== "approved" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedFarmer, "approved")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition"
                  >
                    <Check size={15} />
                    {t.farmers.actions.approve}
                  </button>
                )}
                {selectedFarmer.farmerStatus !== "suspended" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedFarmer, "suspended")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                  >
                    <Ban size={15} />
                    {t.farmers.actions.suspend}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedFarmer.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={15} />
                  {t.farmers.actions.delete}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}