"use client";

import { useState, useEffect } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { UserPlus, Shield, Trash2, X, User, KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function AdminsPage() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const ta = t.admins;

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mon compte — nom
  const [monNom, setMonNom] = useState("");
  const [savingNom, setSavingNom] = useState(false);

  // Mon compte — mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Création admin
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (userData?.nom) setMonNom(userData.nom);
  }, [userData]);

  const fetchAdmins = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // --- MON COMPTE : modifier le nom ---
  const handleSaveNom = async () => {
    if (!monNom.trim()) {
      toast.error(ta.errors.emptyName);
      return;
    }
    setSavingNom(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { nom: monNom.trim() });
      toast.success(ta.toasts.nameUpdated);
    } catch (e) {
      console.error(e);
      toast.error(ta.errors.updateFailed);
    } finally {
      setSavingNom(false);
    }
  };

  // --- MON COMPTE : changer le mot de passe (avec ancien mot de passe) ---
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error(ta.errors.fillBothFields);
      return;
    }
    if (newPassword.length < 6) {
      toast.error(ta.errors.passwordTooShort);
      return;
    }
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      toast.success(ta.toasts.passwordChanged);
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        toast.error(ta.errors.wrongPassword);
      } else {
        toast.error(ta.errors.changeFailed);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // --- MON COMPTE : email de réinitialisation ---
  const handleSendReset = async () => {
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(ta.toasts.resetSent);
    } catch (e) {
      console.error(e);
      toast.error(ta.errors.sendFailed);
    } finally {
      setSendingReset(false);
    }
  };

  // --- CRÉER UN ADMIN ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nom || !email || !password) {
      toast.error(ta.errors.allFieldsRequired);
      return;
    }
    if (password.length < 6) {
      toast.error(ta.errors.passwordTooShort);
      return;
    }

    setCreating(true);
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      await setDoc(doc(db, "users", newUser.uid), {
        nom,
        email,
        role: "admin",
        isActive: true,
        createdAt: serverTimestamp(),
      });

      toast.success(ta.toasts.adminCreated);
      setNom("");
      setEmail("");
      setPassword("");
      setModalOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        toast.error(ta.errors.emailInUse);
      } else if (error.code === "auth/invalid-email") {
        toast.error(ta.errors.invalidEmail);
      } else {
        toast.error(ta.errors.createFailed);
      }
    } finally {
      await deleteApp(secondaryApp);
      setCreating(false);
    }
  };

  // --- RETIRER UN ADMIN ---
  const handleDelete = async (adminId, adminName) => {
    if (adminId === user?.uid) {
      toast.error(ta.errors.cannotRemoveSelf);
      return;
    }
    if (!confirm(ta.confirmRemove.replace("{name}", adminName))) return;

    try {
      await deleteDoc(doc(db, "users", adminId));
      toast.success(ta.toasts.adminRemoved);
      fetchAdmins();
    } catch (e) {
      console.error(e);
      toast.error(ta.errors.generic);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-green-600 font-medium">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{ta.title}</h2>
        <p className="text-gray-500 mt-1">{ta.subtitle}</p>
      </div>

      {/* MON COMPTE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-green-600" />
          <h3 className="font-semibold text-gray-800">{ta.myAccount}</h3>
        </div>

        {/* Nom */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{ta.fullName}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={monNom}
              onChange={(e) => setMonNom(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSaveNom}
              disabled={savingNom}
              className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {savingNom ? "..." : ta.save}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={16} className="text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">{ta.changePassword}</h4>
          </div>

          {/* Champs leurres cachés pour absorber l'autofill du navigateur */}
          <input type="text" name="fake-user" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="fake-pass" autoComplete="current-password" className="hidden" tabIndex={-1} />

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{ta.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{ta.newPassword}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={ta.minChars}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {changingPassword ? ta.changing : ta.changePasswordBtn}
            </button>

            <button
              onClick={handleSendReset}
              disabled={sendingReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Mail size={15} />
              {sendingReset ? ta.sending : ta.forgotPassword}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{ta.passwordHint}</p>
        </div>
      </div>

      {/* AUTRES ADMINISTRATEURS */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h3 className="font-semibold text-gray-800">{ta.allAdmins}</h3>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
          >
            <UserPlus size={16} />
            {ta.newAdmin}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {admins.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{ta.noAdmins}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {admins.map((admin) => {
                const isMe = admin.id === user?.uid;
                return (
                  <div key={admin.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">
                      {admin.nom?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{admin.nom || "—"}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          <Shield size={11} /> {ta.adminBadge}
                        </span>
                        {isMe && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {ta.you}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                    </div>
                    {!isMe && (
                      <button
                        onClick={() => handleDelete(admin.id, admin.nom)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        title={ta.removeRights}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal création */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{ta.newAdmin}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4" autoComplete="off">
              {/* Champs leurres pour absorber l'autofill */}
              <input type="text" name="fake-user-2" autoComplete="username" className="hidden" tabIndex={-1} />
              <input type="password" name="fake-pass-2" autoComplete="current-password" className="hidden" tabIndex={-1} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{ta.fullName}</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Jean Rakoto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{ta.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="admin@greensense.mg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{ta.passwordLabel}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={ta.minChars}
                />
                <p className="text-xs text-gray-400 mt-1">{ta.createHint}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  {ta.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {creating ? ta.creating : ta.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}