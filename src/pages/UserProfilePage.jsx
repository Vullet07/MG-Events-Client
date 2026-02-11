import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import "./UserProfilePage.css";

export default function UserProfilePage() {
  const { id } = useParams();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("threads");
  const [tabData, setTabData] = useState({
    threads: { items: [], page: 1, totalPages: 1 },
    posts: { items: [], page: 1, totalPages: 1 },
    pins: { items: [], page: 1, totalPages: 1 }
  });
  const [error, setError] = useState("");
  const currentPage = tabData[activeTab].page;

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

  useEffect(() => {
    const fetchTab = async () => {
      try {
        const res = await api.get(`/user/public/${id}/${activeTab}?page=${currentPage}&pageSize=6`);
        setTabData((prev) => ({
          ...prev,
          [activeTab]: {
            items: res.data?.items || [],
            page: res.data?.page || currentPage,
            totalPages: res.data?.totalPages || 1
          }
        }));
      } catch (err) {
        setError(err?.message || "Unable to load profile content.");
      }
    };

    fetchTab();
  }, [activeTab, id, currentPage]);

  const changePage = (nextPage) => {
    setTabData((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        page: nextPage
      }
    }));
  };

  const setTab = (tab) => {
    setActiveTab(tab);
  };

  const tab = tabData[activeTab];

  const renderTabItems = () => {
    if (tab.items.length === 0) {
      return <p className="muted">No {activeTab} yet.</p>;
    }

    if (activeTab === "threads") {
      return tab.items.map((item) => (
        <Link key={item.threadId} to={`/threads/${item.threadId}`} className="profile-item">
          <strong>{item.title}</strong>
          <span className="muted">{formatDateTime(item.lastPostAt || item.createdAt)}</span>
        </Link>
      ));
    }

    if (activeTab === "posts") {
      return tab.items.map((item) => (
        <Link key={item.postId} to={`/threads/${item.threadId}`} className="profile-item">
          <strong>{item.title || item.threadTitle}</strong>
          <p>{item.content}</p>
          <span className="muted">
            {formatDateTime(item.createdAt)} | Score {item.score}
          </span>
        </Link>
      ));
    }

    return tab.items.map((item) => (
      <div key={item.pinId} className="profile-item">
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
        <span className="muted">
          {formatDateTime(item.createdAt)} | Score {item.score}
        </span>
      </div>
    ));
  };

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
              src={profile.photoUrl || "/avatar-placeholder.svg"}
              alt="Profile"
            />
            <div>
              <h3>{profile.username}</h3>
              <p className="muted">{profile.email}</p>
              <span className="tag tag-secondary">{profile.role}</span>
              <p className="muted">
                Threads: {profile.threadsCount || 0} | Posts: {profile.postsCount || 0} | Pins: {profile.pinsCount || 0}
              </p>
              <Link
                to={`/report?type=User&id=${id}&label=${encodeURIComponent(profile.username)}&returnTo=${encodeURIComponent(location.pathname)}`}
                className="btn btn-danger"
              >
                Report User
              </Link>
            </div>
          </div>
        )}

        <div className="profile-tabs">
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "threads" ? "tab-active" : ""}`}
            onClick={() => setTab("threads")}
          >
            Threads
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "posts" ? "tab-active" : ""}`}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "pins" ? "tab-active" : ""}`}
            onClick={() => setTab("pins")}
          >
            Pins
          </button>
        </div>

        <div className="profile-items">{renderTabItems()}</div>

        <div className="profile-pagination">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={tab.page <= 1}
            onClick={() => changePage(tab.page - 1)}
          >
            Prev
          </button>
          <span className="pill">
            Page {tab.page} / {tab.totalPages || 1}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={tab.page >= (tab.totalPages || 1)}
            onClick={() => changePage(tab.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
