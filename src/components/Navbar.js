"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Recherche globale
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState({ users: [], agriculteurs: [], publications: [] });
  const [dataCache, setDataCache] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef(null);

  const displayName =
    userData?.nom || user?.displayName || user?.email?.split("@")[0] || t.navbar.admin;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Charger les données une seule fois (au premier focus)
  const loadData = async () => {
    if (dataCache) return dataCache;
    setLoadingSearch(true);
    try {
      const [usersSnap, agriSnap, pubSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "consommateur"))),
        getDocs(collection(db, "agriculteurs")),
        getDocs(collection(db, "publications")),
      ]);

      const data = {
        users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        agriculteurs: agriSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        publications: pubSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
      setDataCache(data);
      return data;
    } catch (e) {
      console.error("Erreur recherche:", e);
      return { users: [], agriculteurs: [], publications: [] };
    } finally {
      setLoadingSearch(false);
    }
  };

  // Filtrer à chaque frappe (avec debounce léger)
  useEffect(() => {
    if (!search.trim()) {
      setResults({ users: [], agriculteurs: [], publications: [] });
      return;
    }

    const timer = setTimeout(async () => {
      const data = await loadData();
      const q = search.toLowerCase();

      setResults({
        users: data.users
          .filter(
            (u) =>
              u.nom?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)
          )
          .slice(0, 4),
        agriculteurs: data.agriculteurs
          .filter(
            (a) =>
              a.nomFerme?.toLowerCase().includes(q) ||
              a.adresse?.toLowerCase().includes(q)
          )
          .slice(0, 4),
        publications: data.publications
          .filter(
            (p) =>
              p.contenu?.toLowerCase().includes(q) ||
              p.produit?.toLowerCase().includes(q) ||
              p.agriculteurNom?.toLowerCase().includes(q)
          )
          .slice(0, 4),
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleResultClick = (path) => {
    setSearch("");
    setSearchOpen(false);
    router.push(path);
  };

  const totalResults =
    results.users.length + results.agriculteurs.length + results.publications.length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">

      {/* Barre de recherche globale */}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-72 focus-within:border-green-500 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder={t.navbar.placeholder}
            autoComplete="off"
            name="global-search-nav"
            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Résultats */}
        {searchOpen && search.trim() && (
          <div className="absolute top-12 left-0 w-96 bg-white rounded-xl border border-gray-100 shadow-lg py-2 max-h-96 overflow-y-auto z-20">
            {loadingSearch ? (
              <p className="px-4 py-3 text-sm text-gray-400">{t.navbar.searching}</p>
            ) : totalResults === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">{t.navbar.noResults}</p>
            ) : (
              <>
                {/* Utilisateurs */}
                {results.users.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {t.navbar.usersCategory}
                    </p>
                    {results.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleResultClick("/dashboard/utilisateurs")}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {u.nom?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.nom || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Agriculteurs */}
                {results.agriculteurs.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {t.navbar.farmersCategory}
                    </p>
                    {results.agriculteurs.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleResultClick("/dashboard/agriculteurs")}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          🌾
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.nomFerme || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{a.adresse || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Publications */}
                {results.publications.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {t.navbar.publicationsCategory}
                    </p>
                    {results.publications.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleResultClick("/dashboard/publications")}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          📢
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {p.produit || p.contenu?.slice(0, 30) || "—"}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{p.agriculteurNom || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">

        {/* Toggle langue */}
        <button
          onClick={toggleLanguage}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-green-500 hover:text-green-600 transition"
        >
          {language === "fr" ? "EN" : "FR"}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* User + menu déroulant */}
        <div className="relative" ref={menuRef}>
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-green-600 transition">
                {displayName}
              </p>
              <p className="text-xs text-gray-400">{t.navbar.role}</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 group-hover:text-green-600 transition ${menuOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-2 z-20">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {t.navbar.logout}
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}