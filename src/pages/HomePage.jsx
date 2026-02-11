import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="page-shell">
      <div className="hero">
        <h1>
          Welcome back{user?.username ? `, ${user.username}` : ""}.
        </h1>
        <p>{loading ? "Loading your profile..." : `Role: ${user?.role || "Member"}`}</p>
      </div>

      <div className="home-grid">
        <div className="card card-pad">
          <h2 className="section-title">Quick Actions</h2>
          <p className="section-subtitle">
            Jump into the forum or keep your profile updated.
          </p>
          <div className="home-links">
            <Link to="/threads" className="btn btn-primary">Explore Threads</Link>
            <Link to="/create-thread" className="btn btn-secondary">Start a Thread</Link>
            <Link to="/map" className="btn btn-ghost">Open Event Map</Link>
            <Link to="/profile" className="btn btn-ghost">My Profile</Link>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="section-title">Community</h2>
          <p className="section-subtitle">
            See what others are sharing and add your voice.
          </p>
          <div className="home-links">
            <Link to="/threads" className="btn btn-ghost">Latest Discussions</Link>
          </div>
        </div>

        {(user?.role === "Admin" || user?.role === "Teacher") && (
          <div className="card card-pad">
            <h2 className="section-title">Moderation Hub</h2>
            <p className="section-subtitle">
              Manage users, moderations, and community health.
            </p>
            <div className="home-links">
              <Link to="/admin/users" className="btn btn-primary">Moderation Dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
