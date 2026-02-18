import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import L from "leaflet";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultCenter = [42.6977, 23.3219];

const markerIconInstance = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -32],
  shadowSize: [41, 41]
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: (e) => {
      onSelect([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [pins, setPins] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selected, setSelected] = useState(null);
  const [latestCreatedPin, setLatestCreatedPin] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(-20);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const res = await api.get("/event-pins");
        setPins(res.data?.items || res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на маркерите.");
      }
    };

    fetchPins();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setFeedback("Съвет: кликни на картата, избери локация и после подай маркер.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const markerPositions = useMemo(
    () =>
      pins
        .map((pin) => ({
          id: pin.id,
          lat: Number(pin.latitude),
          lng: Number(pin.longitude),
          title: pin.title,
          description: pin.description,
          photoUrl: pin.photoUrl,
          createdAt: pin.createdAt,
          createdBy: pin.createdByUsername,
          upvotes: pin.upvotes || 0,
          downvotes: pin.downvotes || 0,
          score: pin.score || 0,
          myVote: pin.myVote || 0
        }))
        .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng)),
    [pins]
  );

  const filteredPins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return markerPositions.filter((pin) => {
      if (pin.score < minScore) return false;
      if (onlyWithPhoto && !pin.photoUrl) return false;
      if (!query) return true;

      const haystack = `${pin.title || ""} ${pin.description || ""} ${pin.createdBy || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [markerPositions, search, minScore, onlyWithPhoto]);

  const topPins = useMemo(
    () => [...markerPositions].sort((a, b) => b.score - a.score).slice(0, 4),
    [markerPositions]
  );

  const handlePhotoChange = (file) => {
    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Разрешени са само изображения.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Снимката трябва да е до 5MB.");
      return;
    }

    setError("");
    setPhotoFile(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!selected) {
      setError("Кликни върху картата, за да избереш локация.");
      return;
    }
    if (!title.trim()) {
      setError("Заглавието е задължително.");
      return;
    }

    setError("");
    setFeedback("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("latitude", String(selected[0]));
      formData.append("longitude", String(selected[1]));
      if (photoFile) formData.append("photo", photoFile);

      const res = await api.post("/event-pins", formData);
      const createdPin = res.data;
      setPins((prev) => [createdPin, ...prev]);
      setLatestCreatedPin(createdPin);

      if (createdPin?.latitude && createdPin?.longitude) {
        setMapCenter([Number(createdPin.latitude), Number(createdPin.longitude)]);
      }

      setTitle("");
      setDescription("");
      setPhotoFile(null);
      setPhotoPreview("");
      setSelected(null);
      setFeedback("Маркерът е създаден успешно.");
      toast?.success("Маркерът е публикуван.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно създаване на маркер.");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pinId, value) => {
    try {
      await api.post(`/event-pins/${pinId}/vote`, { value });
      setPins((prev) =>
        prev.map((pin) => {
          if (pin.id !== pinId) return pin;

          const oldVote = pin.myVote || 0;
          const nextVote = oldVote === value ? 0 : value;
          const upDelta = (nextVote === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0);
          const downDelta = (nextVote === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0);

          return {
            ...pin,
            myVote: nextVote,
            upvotes: (pin.upvotes || 0) + upDelta,
            downvotes: (pin.downvotes || 0) + downDelta,
            score: (pin.score || 0) + upDelta - downDelta
          };
        })
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно гласуване за маркер.");
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Геолокацията не се поддържа от този браузър.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setMapCenter(coords);
        setSelected(coords);
        setFeedback("Картата е центрирана към твоята локация.");
      },
      () => setError("Няма достъп до текущата локация.")
    );
  };

  return (
    <div className="page-shell map-page">
      <section className="map-layout">
        <aside className="map-panel card card-pad">
          <div className="split-row">
            <h2 className="section-title">Маркери на събития</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleUseMyLocation}>
              Моята локация
            </button>
          </div>
          <p className="section-subtitle">Кликни върху картата, попълни детайли и подай нов маркер.</p>

          {error && <p className="error-msg">{error}</p>}
          {feedback && <p className="success-msg">{feedback}</p>}

          <form onSubmit={handleCreate} className="form-grid">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заглавие" />
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
            />
            <input className="input" type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)} />
            {photoPreview && <img src={photoPreview} alt="Преглед" className="photo-preview" />}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Публикуване..." : "Създай маркер"}
            </button>
          </form>

          {selected && (
            <div className="selected-coords">
              Избрани координати: {selected[0].toFixed(5)}, {selected[1].toFixed(5)}
            </div>
          )}

          {latestCreatedPin && (
            <div className="map-created-flow">
              <h3>Последно добавен маркер</h3>
              <p className="muted">{latestCreatedPin.title}</p>
              <div className="map-created-flow__actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    setMapCenter([Number(latestCreatedPin.latitude), Number(latestCreatedPin.longitude)])
                  }
                >
                  Покажи на картата
                </button>
                <Link
                  className="btn btn-primary btn-sm"
                  to={`/create-thread?title=${encodeURIComponent(`[Сигнал] ${latestCreatedPin.title || ""}`)}`}
                >
                  Създай тема от сигнала
                </Link>
              </div>
            </div>
          )}

          <div className="map-filters">
            <h3>Филтър на маркерите</h3>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търси по заглавие, описание, автор"
            />
            <label className="map-score-label" htmlFor="min-score">
              Минимална оценка: <strong>{minScore}</strong>
            </label>
            <input
              id="min-score"
              type="range"
              min={-20}
              max={50}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
            <label className="map-check">
              <input
                type="checkbox"
                checked={onlyWithPhoto}
                onChange={(e) => setOnlyWithPhoto(e.target.checked)}
              />
              Показвай само маркери със снимка
            </label>
          </div>

          <div className="map-top-pins">
            <h3>Най-високо оценени</h3>
            {topPins.length === 0 ? (
              <p className="muted">Все още няма маркери.</p>
            ) : (
              topPins.map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  className="map-top-pin"
                  onClick={() => setMapCenter([pin.lat, pin.lng])}
                >
                  <strong>{pin.title}</strong>
                  <span className="muted">Оценка {pin.score}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="map-canvas card">
          <MapContainer center={defaultCenter} zoom={13} className="map-view">
            <MapRecenter center={mapCenter} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={setSelected} />

            {selected && (
              <Marker position={selected} icon={markerIconInstance}>
                <Popup>Нова позиция на маркер</Popup>
              </Marker>
            )}

            {filteredPins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={markerIconInstance}>
                <Popup>
                  <div className="pin-popup">
                    <h3>{pin.title}</h3>
                    {pin.description && <p>{pin.description}</p>}
                    {pin.photoUrl && <img src={pin.photoUrl} alt="Събитие" />}

                    <div className="pin-votes">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleVote(pin.id, 1)}>
                        <span aria-hidden="true">{"\uD83D\uDC4D"}</span> {pin.upvotes}
                      </button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleVote(pin.id, -1)}>
                        <span aria-hidden="true">{"\uD83D\uDC4E"}</span> {pin.downvotes}
                      </button>
                      <span className="pill">Оценка {pin.score}</span>
                    </div>

                    <Link
                      className="btn btn-danger btn-sm"
                      to={`/report?type=Pin&id=${pin.id}&label=${encodeURIComponent(pin.title || "Маркер")}&returnTo=${encodeURIComponent(`${location.pathname}${location.search || ""}`)}`}
                    >
                      Докладвай маркер
                    </Link>

                    <small className="muted">
                      {pin.createdBy || "Неизвестен"} - {formatDateTime(pin.createdAt)}
                    </small>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>
    </div>
  );
}
