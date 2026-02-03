import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/api";
import "./UserProfilePage.css";

export default function UserProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/user/public/${id}`);
        setProfile(res.data);
      } catch (err) {
        setError(err?.message || "Unable to load profile.");
      }
    };
    fetchProfile();
  }, [id]);

  return (
    <div className="page-shell">
      <div className="card card-pad user-profile-card">
        <div className="split-row">
          <h2 className="section-title">User Profile</h2>
          <Link to="/threads" className="btn btn-ghost">Back to Threads</Link>
        </div>

        {error && (
          <div className="profile-restricted">
            <p>{error}</p>
            <p className="muted">
              Some profile details may be restricted to admins.
            </p>
          </div>
        )}

        {profile && (
          <div className="profile-content">
            <img
              src={profile.photoUrl || "https://via.placeholder.com/200"}
              alt="Profile"
            />
            <div>
              <h3>{profile.username}</h3>
              <p className="muted">{profile.email}</p>
              <span className="tag tag-secondary">{profile.role}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
