import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import api from "../api/api";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleUpdate = async () => {
    try {
      if (!profile?.id) return;
      if (!photoFile) {
        setMessage("Please choose a photo to upload.");
        return;
      }
      if (!photoFile.type.startsWith("image/")) {
        setMessage("Only image files are allowed.");
        return;
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        setMessage("Image must be under 5MB.");
        return;
      }
      const formData = new FormData();
      formData.append("file", photoFile);
      const uploadRes = await api.post("/user/profile-photo", formData);
      setProfile(uploadRes.data);
      setPhotoFile(null);
      setPhotoPreview("");
      setMessage("Profile photo updated!");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  if (loading || !user?.id) return <p>Loading...</p>;
  if (!profile) return <p>Loading...</p>;

  return (
    <div className="page-shell">
      <div className="profile-layout">
        <div className="card card-pad profile-card">
          <img
            src={profile.photoUrl || "/avatar-placeholder.svg"}
            alt="Profile"
            className="profile-photo"
          />
          <h2>{profile.username}</h2>
          <p className="muted">{profile.email}</p>
          <span className="tag tag-secondary">{profile.role}</span>
        </div>

        <div className="card card-pad profile-editor">
          <h3>Update Photo</h3>
          <p className="muted">Upload a new profile photo.</p>
          {message && <p className="success-msg">{message}</p>}
          <div className="form-grid">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            )}
            <button className="btn btn-primary" onClick={handleUpdate}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
