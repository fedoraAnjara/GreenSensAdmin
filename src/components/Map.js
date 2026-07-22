"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl";

const MARKER_COLORS = {
  vente: "#16a34a",
  cultivation: "#d97706",
  elevage: "#2563eb",
};

export default function MapComponent({ points, onMapClick, onMarkerClick, flyTo }) {
  const [popupInfo, setPopupInfo] = useState(null);
  const mapRef = useRef(null);

  // Recentre la carte quand une recherche de lieu aboutit
  useEffect(() => {
    if (flyTo?.lat != null && flyTo?.lng != null && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom ?? 12,
        duration: 1500,
        essential: true,
      });
    }
  }, [flyTo]);

  const handleClick = useCallback(
    (e) => {
      setPopupInfo(null);
      onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onMapClick]
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 47.5361,
        latitude: -18.9137,
        zoom: 5,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onClick={handleClick}
    >
      <NavigationControl position="top-right" />
      <FullscreenControl position="top-right" />

      {points.map((point) => (
        <Marker
          key={point.id}
          longitude={point.longitude}
          latitude={point.latitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopupInfo(point);
            onMarkerClick(point);
          }}
        >
          <div
            className="cursor-pointer transition hover:scale-110"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50% 50% 50% 0",
              backgroundColor: MARKER_COLORS[point.type] || MARKER_COLORS.vente,
              border: "2px solid white",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              transform: "rotate(-45deg)",
            }}
          />
        </Marker>
      ))}

      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="top"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
        >
          <div className="p-1 text-sm">
            <p className="font-semibold text-gray-800">{popupInfo.nom}</p>
            {popupInfo.adresse && (
              <p className="text-gray-500 text-xs mt-0.5">{popupInfo.adresse}</p>
            )}
            {popupInfo.agriculteurNom && (
              <p className="text-green-600 text-xs mt-0.5">{popupInfo.agriculteurNom}</p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}