import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import api from "../api/api";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setProfile(res.data);
        setPhotoUrl(res.data.photoUrl || "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleUpdate = async () => {
    try {
      if (!profile?.id) return;
      await api.put(`/user/${profile.id}`, { photoUrl });
      setMessage("Profile updated!");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user?.id) return <p>Loading...</p>;
  if (!profile) return <p>Loading...</p>;

  return (
    <div className="page-shell">
      <div className="profile-layout">
        <div className="card card-pad profile-card">
          <img
            src={profile.photoUrl || "https://via.placeholder.com/200"}
            alt="Profile"
            className="profile-photo"
          />
          <h2>{profile.username}</h2>
          <p className="muted">{profile.email}</p>
          <span className="tag tag-secondary">{profile.role}</span>
        </div>

        <div className="card card-pad profile-editor">
          <h3>Update Photo</h3>
          <p className="muted">Paste a new image URL and save.</p>
          {message && <p className="success-msg">{message}</p>}
          <div className="form-grid">
            <input
              className="input"
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Profile photo URL"
            />
            <button className="btn btn-primary" onClick={handleUpdate}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
