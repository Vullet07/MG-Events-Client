import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { Link, useLocation } from "react-router-dom";
import L from "leaflet";
import api from "../api/api";
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

export default function MapPage() {
  const location = useLocation();
  const [pins, setPins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const res = await api.get("/event-pins");
        setPins(res.data.items || res.data || []);
      } catch (err) {
        setError(err?.message || "Failed to load map pins.");
      }
    };
    fetchPins();
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const handlePhotoChange = (file) => {
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > maxSize) {
      setError("Image must be under 5MB.");
      return;
    }
    setError("");
    setPhotoFile(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError("Click on the map to choose a location.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    setFeedback("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("latitude", String(selected[0]));
      formData.append("longitude", String(selected[1]));
      if (photoFile) formData.append("photo", photoFile);

      const res = await api.post("/event-pins", formData);
      setPins((prev) => [res.data, ...prev]);
      setTitle("");
      setDescription("");
      setPhotoFile(null);
      setPhotoPreview("");
      setSelected(null);
      setFeedback("Pin created.");
    } catch (err) {
      setError(err?.message || "Failed to create pin.");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pinId, value) => {
    try {
      await api.post(`/event-pins/${pinId}/vote`, { value });
      setPins((prev) =>
        prev.map((p) => {
          if (p.id !== pinId) return p;
          const oldVote = p.myVote || 0;
          const nextVote = oldVote === value ? 0 : value;
          const upDelta = (nextVote === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0);
          const downDelta = (nextVote === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0);
          return {
            ...p,
            myVote: nextVote,
            upvotes: (p.upvotes || 0) + upDelta,
            downvotes: (p.downvotes || 0) + downDelta,
            score: (p.score || 0) + upDelta - downDelta
          };
        })
      );
    } catch (err) {
      setError(err?.message || "Failed to vote on pin.");
    }
  };

  const markerPositions = useMemo(
    () =>
      pins.map((pin) => ({
        id: pin.id,
        lat: pin.latitude,
        lng: pin.longitude,
        title: pin.title,
        description: pin.description,
        photoUrl: pin.photoUrl,
        createdAt: pin.createdAt,
        createdBy: pin.createdByUsername,
        upvotes: pin.upvotes || 0,
        downvotes: pin.downvotes || 0,
        score: pin.score || 0
      })),
    [pins]
  );

  return (
    <div className="page-shell map-page">
      <div className="map-layout">
        <div className="map-panel card card-pad">
          <h2 className="section-title">Event Map</h2>
          <p className="section-subtitle">
            Click on the map to drop a pin and report an event.
          </p>

          {error && <p className="error-msg">{error}</p>}
          {feedback && <p className="success-msg">{feedback}</p>}

          <form onSubmit={handleCreate} className="form-grid">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            )}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Posting..." : "Create Pin"}
            </button>
          </form>

          {selected && (
            <div className="selected-coords">
              Selected: {selected[0].toFixed(5)}, {selected[1].toFixed(5)}
            </div>
          )}
        </div>

        <div className="map-canvas card">
          <MapContainer center={defaultCenter} zoom={13} className="map-view">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={setSelected} />
            {selected && (
              <Marker position={selected} icon={markerIconInstance}>
                <Popup>New pin location</Popup>
              </Marker>
            )}
            {markerPositions.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={markerIconInstance}>
                <Popup>
                  <div className="pin-popup">
                    <h3>{pin.title}</h3>
                    <p>{pin.description}</p>
                    {pin.photoUrl && <img src={pin.photoUrl} alt="Event" />}
                    <div className="pin-votes">
                      <button className="btn btn-ghost" onClick={() => handleVote(pin.id, 1)}>
                        <span aria-hidden="true">👍</span> {pin.upvotes}
                      </button>
                      <button className="btn btn-ghost" onClick={() => handleVote(pin.id, -1)}>
                        <span aria-hidden="true">👎</span> {pin.downvotes}
                      </button>
                      <span className="pill">Score {pin.score}</span>
                    </div>
                    <Link
                      className="btn btn-danger"
                      to={`/report?type=Pin&id=${pin.id}&label=${encodeURIComponent(pin.title || "Pin")}&returnTo=${encodeURIComponent(location.pathname)}`}
                    >
                      Report Pin
                    </Link>
                    <small className="muted">
                      {pin.createdBy} - {formatDateTime(pin.createdAt)}
                    </small>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
