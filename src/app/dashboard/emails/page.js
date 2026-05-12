"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Send, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function EmailsPage() {
  const { t } = useLanguage();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "emailHistory"), orderBy("sentAt", "desc"))
      );
      setHistory(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getRecipients = async () => {
    try {
      let q;
      if (recipientType === "all") {
        q = query(collection(db, "users"));
      } else if (recipientType === "consumers") {
        q = query(collection(db, "users"), where("role", "==", "consommateur"));
      } else {
        q = query(collection(db, "users"), where("role", "==", "agriculteur"));
      }
      const snap = await getDocs(q);
      return snap.docs.map((doc) => doc.data().email).filter(Boolean);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Veuillez remplir le sujet et le message");
      return;
    }

    setSending(true);
    try {
      const recipients = await getRecipients();

      if (recipients.length === 0) {
        toast.error(t.emails.noRecipients);
        return;
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, subject, message }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Sauvegarder dans l'historique
      await addDoc(collection(db, "emailHistory"), {
        subject,
        message,
        recipientType,
        count: recipients.length,
        sentAt: serverTimestamp(),
      });

      toast.success(`${t.emails.sendSuccess} ${recipients.length} ${t.emails.users}`);
      setSubject("");
      setMessage("");
      fetchHistory();

    } catch (error) {
      toast.error(t.emails.sendError);
      console.error(error);
    } finally {
      setSending(false);
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t.emails.title}</h2>
        <p className="text-gray-500 mt-1">{t.emails.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

          {/* Destinataires */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.emails.form.recipients}
            </label>
            <div className="flex gap-2">
              {Object.entries(t.emails.recipientOptions).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRecipientType(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition
                    ${recipientType === key
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.emails.form.subject}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.emails.form.subjectPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.emails.form.message}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.emails.form.messagePlaceholder}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Bouton envoyer */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? t.emails.form.sending : t.emails.form.send}
          </button>

        </div>

        {/* Historique */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail size={18} />
            {t.emails.history.title}
          </h3>

          {loadingHistory ? (
            <div className="text-sm text-green-600">Chargement...</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">{t.emails.history.noData}</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{item.subject}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(item.sentAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {t.emails.recipientOptions[item.recipientType]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.count} {t.emails.users}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}