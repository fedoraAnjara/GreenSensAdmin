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
import { Eye, UserCheck, UserX, Trash2, Search, X } from "lucide-react";
import toast from "react-hot-toast";

export default function UtilisateursPage() {
  const { t } = useLanguage();

  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "consommateur"))
      );
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setFiltered(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Recherche + filtre
  useEffect(() => {
    let result = [...users];
    if (filter === "active") result = result.filter((u) => u.isActive !== false);
    if (filter === "inactive") result = result.filter((u) => u.isActive === false);
    if (search.trim()) {
      result = result.filter(
        (u) =>
          u.nom?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(result);
  }, [search, filter, users]);

  // Ouvrir le modal
  const handleViewDetail = async (user) => {
    setSelectedUser(user);
    setHealthProfile(null);
    setModalLoading(true);
    try {
      const healthSnap = await getDoc(
        doc(db, "users", user.id, "profilSante", "data")
      );
      if (healthSnap.exists()) setHealthProfile(healthSnap.data());
    } catch (error) {
      console.error(error);
    } finally {
      setModalLoading(false);
    }
  };

  // Fermer le modal
  const handleCloseModal = () => {
    setSelectedUser(null);
    setHealthProfile(null);
  };

  const handleToggleActive = async (user) => {
    try {
      const newStatus = user.isActive === false ? true : false;
      await updateDoc(doc(db, "users", user.id), { isActive: newStatus });
      toast.success(newStatus ? t.users.activateSuccess : t.users.deactivateSuccess);
      // Mettre à jour le selectedUser si c'est lui dans le modal
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, isActive: newStatus }));
      }
      fetchUsers();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm(t.users.actions.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success(t.users.deleteSuccess);
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate?.() ?? new Date(timestamp);
    return date.toLocaleDateString("fr-FR");
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
        <h2 className="text-2xl font-bold text-gray-800">{t.users.title}</h2>
        <p className="text-gray-500 mt-1">{t.users.subtitle}</p>
      </div>

      {/* Recherche + Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.users.search}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${filter === f
                  ? "bg-green-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
            >
              {t.users.filter[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.users.noData}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.users.table.name}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.users.table.email}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.users.table.status}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.users.table.joinedAt}</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.users.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                        {user.nom?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="font-medium text-gray-800">{user.nom || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                      ${user.isActive !== false
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                      }`}>
                      {user.isActive !== false ? t.users.status.active : t.users.status.inactive}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(user)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        title={t.users.actions.view}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-1.5 rounded-lg transition
                          ${user.isActive !== false
                            ? "text-gray-500 hover:bg-red-50 hover:text-red-600"
                            : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                          }`}
                        title={user.isActive !== false ? t.users.actions.deactivate : t.users.actions.activate}
                      >
                        {user.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                        title={t.users.actions.delete}
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
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseModal}
          />

          {/* Contenu */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{t.users.detail.title}</h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Avatar + nom + statut */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                  {selectedUser.nom?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-800">{selectedUser.nom || "—"}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${selectedUser.isActive !== false
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                    }`}>
                    {selectedUser.isActive !== false ? t.users.status.active : t.users.status.inactive}
                  </span>
                </div>
              </div>

              {/* Infos personnelles */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.users.detail.personalInfo}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t.users.detail.email, value: selectedUser.email },
                    { label: t.users.detail.role, value: t.users.roles[selectedUser.role] || selectedUser.role },
                    { label: t.users.detail.joinedAt, value: formatDate(selectedUser.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profil de santé */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t.users.detail.healthInfo}
                </p>
                {modalLoading ? (
                  <div className="text-sm text-green-600">Chargement...</div>
                ) : !healthProfile ? (
                  <p className="text-sm text-gray-400">{t.users.detail.noHealthData}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t.users.detail.weight, value: healthProfile.poids ? `${healthProfile.poids} kg` : "—" },
                      { label: t.users.detail.height, value: healthProfile.taille ? `${healthProfile.taille} cm` : "—" },
                      { label: t.users.detail.imc, value: healthProfile.imc ?? "—" },
                      { label: t.users.detail.pathologies, value: healthProfile.pathologies?.join(", ") || "—" },
                      { label: t.users.detail.allergies, value: healthProfile.allergies?.join(", ") || "—" },
                      { label: t.users.detail.objectives, value: healthProfile.objectifs?.join(", ") || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm font-medium text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleToggleActive(selectedUser)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition
                    ${selectedUser.isActive !== false
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                    }`}
                >
                  {selectedUser.isActive !== false
                    ? <><UserX size={15} /> {t.users.actions.deactivate}</>
                    : <><UserCheck size={15} /> {t.users.actions.activate}</>
                  }
                </button>
                <button
                  onClick={() => handleDelete(selectedUser.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={15} />
                  {t.users.actions.delete}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}