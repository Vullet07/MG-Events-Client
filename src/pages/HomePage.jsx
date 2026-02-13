import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./HomePage.css";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({ threads: 0, pins: 0, news: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [threadsRes, pinsRes] = await Promise.all([
          api.get("/forum-threads?page=1&pageSize=200"),
          api.get("/event-pins")
        ]);
        const threads = threadsRes.data?.items || threadsRes.data || [];
        const pins = pinsRes.data?.items || pinsRes.data || [];
        setStats({
          threads: threads.length,
          pins: pins.length,
          news: threads.filter((t) => t.title?.toLowerCase().startsWith("[news]")).length
        });
      } catch {
        // keep dashboard usable even if stat calls fail
      }
    };

    loadStats();
  }, []);

  return (
    <div className="page-shell">
      <div className="hero dashboard-hero">
        <div>
          <h1>Welcome back{user?.username ? `, ${user.username}` : ""}.</h1>
          <p>{loading ? "Loading your profile..." : `Role: ${user?.role || "Member"}`}</p>
        </div>
        <div className="dashboard-stats">
          <div className="stat-chip">
            <strong>{stats.threads}</strong>
            <span>Threads</span>
          </div>
          <div className="stat-chip">
            <strong>{stats.pins}</strong>
            <span>Pins</span>
          </div>
          <div className="stat-chip">
            <strong>{stats.news}</strong>
            <span>News</span>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="card card-pad home-panel">
          <h2 className="section-title">Quick Actions</h2>
          <div className="home-links">
            <Link to="/threads" className="btn btn-primary">Explore Threads</Link>
            <Link to="/create-thread" className="btn btn-secondary">Start a Thread</Link>
            <Link to="/map" className="btn btn-ghost">Open Event Map</Link>
            <Link to="/profile" className="btn btn-ghost">My Profile</Link>
            <Link to="/news" className="btn btn-ghost">News</Link>
          </div>
        </div>

        <div className="card card-pad home-panel">
          <h2 className="section-title">Browse</h2>
          <div className="home-links">
            <Link to="/threads" className="btn btn-ghost">Latest Discussions</Link>
            <Link to="/news" className="btn btn-ghost">Upcoming Events</Link>
            <Link to="/map" className="btn btn-ghost">Nearby Pins</Link>
          </div>
        </div>

        {(user?.role === "Admin" || user?.role === "Teacher") && (
          <div className="card card-pad home-panel">
            <h2 className="section-title">Moderation Hub</h2>
            <div className="home-links">
              <Link to="/admin/users" className="btn btn-primary">Moderation Dashboard</Link>
              <Link to="/news" className="btn btn-secondary">Publish News</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
