"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Eye, Check, Ban, Trash2, Search, X, Plus, Pencil } from "lucide-react";
import toast from "react-hot-toast";

// Normalise un numéro malgache au format international +261XXXXXXXXX
function normalizePhone(raw) {
  let p = (raw || "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("00261")) p = "+" + p.slice(2);
  else if (p.startsWith("261")) p = "+" + p;
  else if (p.startsWith("0")) p = "+261" + p.slice(1);
  else if (!p.startsWith("+")) p = "+261" + p;
  return p;
}

const EMPTY_FORM = {
  nom: "",
  telephone: "",
  nomFerme: "",
  adresse: "",
  description: "",
  certifications: "",
};

export default function AgriculteurPage() {
  const { t } = useLanguage();

  const [farmers, setFarmers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal détails
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmInfo, setFarmInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Modal formulaire (création / édition)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchFarmers = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "agriculteur"))
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  useEffect(() => {
    let result = [...farmers];
    if (filter !== "all") result = result.filter((f) => f.farmerStatus === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.nom?.toLowerCase().includes(q) ||
          f.telephone?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, filter, farmers]);

  // --- DÉTAILS ---
  const handleViewDetail = async (farmer) => {
    setSelectedFarmer(farmer);
    setFarmInfo(null);
    setModalLoading(true);
    try {
      const farmSnap = await getDoc(doc(db, "agriculteurs", farmer.id));
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

  // --- CRÉATION / ÉDITION ---
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = async (farmer) => {
    setEditingId(farmer.id);
    setSaving(false);
    let farm = {};
    try {
      const snap = await getDoc(doc(db, "agriculteurs", farmer.id));
      if (snap.exists()) farm = snap.data();
    } catch (e) {
      console.error(e);
    }
    setForm({
      nom: farmer.nom || "",
      telephone: farmer.telephone || "",
      nomFerme: farm.nomFerme || "",
      adresse: farm.adresse || "",
      description: farm.description || "",
      certifications: (farm.certifications || []).join(", "),
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.telephone.trim()) {
      toast.error(t.farmers.form.requiredFields);
      return;
    }

    const phone = normalizePhone(form.telephone);
    if (!/^\+261\d{9}$/.test(phone)) {
      toast.error(t.farmers.form.invalidPhone);
      return;
    }

    setSaving(true);
    try {
      // Vérifier l'unicité du numéro
      const dup = farmers.find((f) => f.telephone === phone && f.id !== editingId);
      if (dup) {
        toast.error(t.farmers.form.phoneExists);
        setSaving(false);
        return;
      }

      const certifs = form.certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const farmerId = editingId || doc(collection(db, "users")).id;

      // Document utilisateur (rôle agriculteur)
      const userData = {
        nom: form.nom.trim(),
        telephone: phone,
        role: "agriculteur",
        isActive: true,
        farmerStatus: editingId
          ? farmers.find((f) => f.id === editingId)?.farmerStatus || "approved"
          : "approved",
      };
      if (!editingId) {
        userData.email = `${phone.replace("+", "")}@greensense.mg`;
        userData.emailReel = null;
        userData.createdAt = serverTimestamp();
      }
      await setDoc(doc(db, "users", farmerId), userData, { merge: true });

      // Fiche exploitation
      await setDoc(
        doc(db, "agriculteurs", farmerId),
        {
          nomFerme: form.nomFerme.trim(),
          adresse: form.adresse.trim(),
          description: form.description.trim(),
          certifications: certifs,
          ...(editingId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );

      toast.success(
        editingId ? t.farmers.form.updateSuccess : t.farmers.form.createSuccess
      );
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchFarmers();
    } catch (error) {
      console.error(error);
      toast.error(t.farmers.form.saveError);
    } finally {
      setSaving(false);
    }
  };

  // --- STATUT / SUPPRESSION ---
  const handleUpdateStatus = async (farmer, newStatus) => {
    try {
      await updateDoc(doc(db, "users", farmer.id), { farmerStatus: newStatus });
      if (selectedFarmer?.id === farmer.id) {
        setSelectedFarmer((prev) => ({ ...prev, farmerStatus: newStatus }));
      }
      toast.success(
        newStatus === "approved"
          ? t.farmers.approveSuccess
          : t.farmers.suspendSuccess
      );
      fetchFarmers();
    } catch (error) {
      toast.error(t.farmers.form.saveError);
    }
  };

  const handleDelete = async (farmerId) => {
    if (!confirm(t.farmers.actions.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "users", farmerId));
      await deleteDoc(doc(db, "agriculteurs", farmerId)).catch(() => {});
      toast.success(t.farmers.deleteSuccess);
      handleCloseModal();
      fetchFarmers();
    } catch (error) {
      toast.error(t.farmers.form.saveError);
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
        <div className="text-green-600 font-medium">
          {t.common?.loading || "Chargement..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.farmers.title}</h2>
          <p className="text-gray-500 mt-1">{t.farmers.subtitle}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium my-3 px-4 py-2.5 rounded-lg transition"
        >
          <Plus size={16} />
          {t.farmers.form.newFarmer}
        </button>
      </div>

      {/* Recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.farmers.search}
            autoComplete="off"
            name="farmer-search"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.name}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.farmers.table.phone}</th>
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
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold flex-shrink-0">
                          {farmer.nom?.charAt(0).toUpperCase() || "A"}
                        </div>
                        <span className="font-medium text-gray-800">{farmer.nom || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{farmer.telephone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(farmer.farmerStatus)}`}>
                        {getStatusLabel(farmer.farmerStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(farmer.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetail(farmer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title={t.farmers.actions.view}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(farmer)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition"
                          title={t.farmers.actions.edit}
                        >
                          <Pencil size={16} />
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
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
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
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFormOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editingId ? t.farmers.form.editTitle : t.farmers.form.createTitle}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4" autoComplete="off">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.farmers.form.name} *
                  </label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Razaka Vony"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.farmers.form.phone} *
                  </label>
                  <input
                    type="tel"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+261 34 12 345 67"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t.farmers.form.phoneHint}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.farmers.form.farmName}
                </label>
                <input
                  type="text"
                  value={form.nomFerme}
                  onChange={(e) => setForm({ ...form, nomFerme: e.target.value })}
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Chez Fara"
                />
                <p className="text-xs text-gray-400 mt-1">{t.farmers.form.farmNameHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.farmers.form.address}
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Antsirabe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.farmers.form.description}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Des légumes gros calibres et bio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.farmers.form.certifications}
                </label>
                <input
                  type="text"
                  value={form.certifications}
                  onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Bio, Commerce équitable"
                />
                <p className="text-xs text-gray-400 mt-1">{t.farmers.form.certifHint}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  {t.farmers.form.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {saving ? t.farmers.form.saving : t.farmers.form.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{t.farmers.detail.title}</h3>
              <button onClick={handleCloseModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">

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

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.farmers.detail.personalInfo}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t.farmers.detail.phone, value: selectedFarmer.telephone },
                    { label: t.farmers.detail.joinedAt, value: formatDate(selectedFarmer.createdAt) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.farmers.detail.farmInfo}
                </p>
                {modalLoading ? (
                  <div className="text-sm text-green-600">{t.common?.loading || "Chargement..."}</div>
                ) : !farmInfo ? (
                  <p className="text-sm text-gray-400">{t.farmers.detail.noFarmInfo}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t.farmers.detail.farmName, value: farmInfo.nomFerme },
                      { label: t.farmers.detail.address, value: farmInfo.adresse },
                      { label: t.farmers.detail.description, value: farmInfo.description || t.farmers.detail.noDescription },
                      { label: t.farmers.detail.certifications, value: farmInfo.certifications?.join(", ") || t.farmers.detail.noCertifications },
                    ].map(({ label, value }, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                <button
                  onClick={() => { handleCloseModal(); openEdit(selectedFarmer); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
                >
                  <Pencil size={15} />
                  {t.farmers.actions.edit}
                </button>
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