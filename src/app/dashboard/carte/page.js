"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import { Plus, Edit, Trash2, X, MapPin, Search, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const emptyForm = {
  nom: "",
  type: "vente",
  adresse: "",
  latitude: "",
  longitude: "",
  agriculteurId: "",
  agriculteurNom: "",
};

export default function CartePage() {
  const { t } = useLanguage();

  const [points, setPoints] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Recherche de lieux (géocodage OpenStreetMap / Nominatim)
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [flyTo, setFlyTo] = useState(null);

  const fetchPoints = async () => {
    try {
      const snap = await getDocs(collection(db, "pointsDeVente"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPoints(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer uniquement les agriculteurs approuvés
  const fetchFarmers = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "users"),
          where("role", "==", "agriculteur"),
          where("farmerStatus", "==", "approved")
        )
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFarmers(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPoints();
    fetchFarmers();
  }, []);

  // Géocodage (délai de 600 ms pour respecter la limite du service)
  useEffect(() => {
    if (!placeQuery.trim() || placeQuery.trim().length < 3) {
      setPlaceResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlace(true);
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=json&limit=6" +
          "&countrycodes=mg&q=" +
          encodeURIComponent(placeQuery.trim());
        const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const data = await res.json();
        setPlaceResults(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Erreur géocodage:", e);
        setPlaceResults([]);
      } finally {
        setSearchingPlace(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [placeQuery]);

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setFlyTo({ lat, lng, zoom: 12, ts: Date.now() });
    setPlaceQuery(place.display_name.split(",")[0]);
    setShowPlaceResults(false);
  };

  const handleMapClick = (latlng) => {
    setForm((prev) => ({
      ...prev,
      latitude: latlng.lat.toFixed(6),
      longitude: latlng.lng.toFixed(6),
    }));
    setShowModal(true);
  };

  const handleMarkerClick = (point) => {
    setForm({
      nom: point.nom,
      type: point.type,
      adresse: point.adresse,
      latitude: point.latitude,
      longitude: point.longitude,
      agriculteurId: point.agriculteurId || "",
      agriculteurNom: point.agriculteurNom || "",
    });
    setEditingId(point.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  // Quand l'admin sélectionne un agriculteur
  const handleFarmerChange = (e) => {
    const selectedId = e.target.value;
    const selectedFarmer = farmers.find((f) => f.id === selectedId);
    setForm((prev) => ({
      ...prev,
      agriculteurId: selectedId,
      agriculteurNom: selectedFarmer?.nom || "",
    }));
  };

  const handleSave = async () => {
    if (!form.nom || !form.latitude || !form.longitude) {
      toast.error(t.map.modal.requiredFields);
      return;
    }
    setSaving(true);
    try {
      const data = {
        nom: form.nom,
        type: form.type,
        adresse: form.adresse,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        agriculteurId: form.agriculteurId || null,
        agriculteurNom: form.agriculteurNom || null,
      };

      if (editingId) {
        await updateDoc(doc(db, "pointsDeVente", editingId), data);
        toast.success(t.map.updateSuccess);
      } else {
        await addDoc(collection(db, "pointsDeVente"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success(t.map.addSuccess);
      }

      handleCloseModal();
      fetchPoints();
    } catch (error) {
      toast.error(t.map.modal.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.map.modal.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "pointsDeVente", id));
      toast.success(t.map.deleteSuccess);
      handleCloseModal();
      fetchPoints();
    } catch (error) {
      toast.error(t.map.modal.saveError);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.map.title}</h2>
          <p className="text-gray-500 mt-1">{t.map.subtitle}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
        >
          <Plus size={16} />
          {t.map.addPoint}
        </button>
      </div>

      {/* Recherche de lieu */}
      <div className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setShowPlaceResults(true);
            }}
            onFocus={() => setShowPlaceResults(true)}
            onBlur={() => setTimeout(() => setShowPlaceResults(false), 200)}
            placeholder={t.map.searchPlace}
            autoComplete="off"
            name="place-search"
            className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searchingPlace && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-spin" />
          )}
          {!searchingPlace && placeQuery && (
            <button
              onClick={() => { setPlaceQuery(""); setPlaceResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showPlaceResults && placeResults.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-gray-100 shadow-lg py-2 max-h-72 overflow-y-auto z-[1000]">
            {placeResults.map((place) => (
              <button
                key={place.place_id}
                onClick={() => handleSelectPlace(place)}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
              >
                <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {place.display_name.split(",")[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{place.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showPlaceResults && !searchingPlace && placeQuery.trim().length >= 3 && placeResults.length === 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-gray-100 shadow-lg px-4 py-3 z-[1000]">
            <p className="text-sm text-gray-400">{t.map.noPlaceFound}</p>
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(t.map.types).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={14} className={
              key === "vente" ? "text-green-600" :
              key === "cultivation" ? "text-amber-500" :
              "text-blue-500"
            } />
            {label}
          </div>
        ))}
      </div>

      {/* Carte */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        style={{ height: "450px" }}
      >
        <Map
          points={points}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
          flyTo={flyTo}
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {points.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.map.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.name}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.type}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.farmer}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.address}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.coordinates}</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">{t.map.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{point.nom}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                        ${point.type === "vente" ? "bg-green-100 text-green-700" :
                          point.type === "cultivation" ? "bg-amber-100 text-amber-600" :
                          "bg-blue-100 text-blue-600"}`}>
                        {t.map.types[point.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {point.agriculteurNom || (
                        <span className="text-gray-400 italic">{t.map.modal.noFarmerLinked}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{point.adresse || "—"}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                      {point.latitude?.toFixed(4)}, {point.longitude?.toFixed(4)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFlyTo({ lat: point.latitude, lng: point.longitude, zoom: 14, ts: Date.now() })}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition"
                          title={t.map.locate}
                        >
                          <MapPin size={16} />
                        </button>
                        <button
                          onClick={() => handleMarkerClick(point)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title={t.map.modal.editTitle}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(point.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                          title={t.map.modal.delete}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editingId ? t.map.modal.editTitle : t.map.modal.addTitle}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* Nom du lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.map.modal.name}
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                  placeholder={t.map.modal.namePlaceholder}
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.map.modal.type}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {Object.entries(t.map.types).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Agriculteur associé */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.map.modal.farmer}
                </label>
                {farmers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">{t.map.modal.noFarmer}</p>
                ) : (
                  <select
                    value={form.agriculteurId}
                    onChange={handleFarmerChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t.map.modal.farmerPlaceholder}</option>
                    {farmers.map((farmer) => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.nom}{farmer.telephone ? ` — ${farmer.telephone}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.map.modal.address}
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e) => setForm((prev) => ({ ...prev, adresse: e.target.value }))}
                  placeholder={t.map.modal.addressPlaceholder}
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Latitude / Longitude */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.map.modal.latitude}
                  </label>
                  <input
                    type="number"
                    value={form.latitude}
                    onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="-18.9137"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.map.modal.longitude}
                  </label>
                  <input
                    type="number"
                    value={form.longitude}
                    onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="47.5361"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">{t.map.modal.clickHint}</p>

              {/* Boutons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {editingId && (
                  <button
                    onClick={() => handleDelete(editingId)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                    title={t.map.modal.delete}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                >
                  {t.map.modal.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? t.map.modal.saving : t.map.modal.save}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}