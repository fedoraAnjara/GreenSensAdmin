"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, UserCheck, UserX, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function UserDetailPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Récupérer l'utilisateur
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
          setUser({ id: userSnap.id, ...userSnap.data() });
        }

        // Récupérer le profil de santé
        const healthSnap = await getDoc(doc(db, "users", id, "profilSante", "data"));
        if (healthSnap.exists()) {
          setHealthProfile(healthSnap.data());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleToggleActive = async () => {
    try {
      const newStatus = user.isActive === false ? true : false;
      await updateDoc(doc(db, "users", id), { isActive: newStatus });
      setUser((prev) => ({ ...prev, isActive: newStatus }));
      toast.success(newStatus ? t.users.activateSuccess : t.users.deactivateSuccess);
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.users.actions.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "users", id));
      toast.success(t.users.deleteSuccess);
      router.push("/dashboard/utilisateurs");
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

  if (!user) {
    return (
      <div className="text-center text-gray-400 mt-20">Utilisateur introuvable</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t.users.detail.title}</h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${user.isActive !== false
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-green-600 hover:bg-green-100"
              }`}
          >
            {user.isActive !== false
              ? <><UserX size={16} /> {t.users.actions.deactivate}</>
              : <><UserCheck size={16} /> {t.users.actions.activate}</>
            }
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 size={16} />
            {t.users.actions.delete}
          </button>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">
          {t.users.detail.personalInfo}
        </h3>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
            {user.nom?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{user.nom || "—"}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
              ${user.isActive !== false
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
              }`}>
              {user.isActive !== false ? t.users.status.active : t.users.status.inactive}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: t.users.detail.email, value: user.email },
            { label: t.users.detail.role, value: t.users.roles[user.role] || user.role },
            { label: t.users.detail.joinedAt, value: formatDate(user.createdAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profil de santé */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">
          {t.users.detail.healthInfo}
        </h3>

        {!healthProfile ? (
          <p className="text-sm text-gray-400">{t.users.detail.noHealthData}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t.users.detail.weight, value: healthProfile.poids ? `${healthProfile.poids} kg` : "—" },
              { label: t.users.detail.height, value: healthProfile.taille ? `${healthProfile.taille} cm` : "—" },
              { label: t.users.detail.imc, value: healthProfile.imc ?? "—" },
              { label: t.users.detail.pathologies, value: healthProfile.pathologies?.join(", ") || "—" },
              { label: t.users.detail.allergies, value: healthProfile.allergies?.join(", ") || "—" },
              { label: t.users.detail.objectives, value: healthProfile.objectifs?.join(", ") || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}