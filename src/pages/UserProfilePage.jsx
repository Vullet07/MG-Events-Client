import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgRole } from "../utils/localize";
import "./UserProfilePage.css";

const initialTabs = {
  threads: { items: [], page: 1, totalPages: 1 },
  posts: { items: [], page: 1, totalPages: 1 },
  pins: { items: [], page: 1, totalPages: 1 }
};

export default function UserProfilePage() {
  const { id } = useParams();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("threads");
  const [tabData, setTabData] = useState(initialTabs);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/user/public/${id}`);
        setProfile(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Профилът не може да бъде зареден.");
      }
    };

    fetchProfile();
  }, [id]);

  useEffect(() => {
    const fetchTab = async () => {
      const page = tabData[activeTab].page;
      try {
        const res = await api.get(`/user/public/${id}/${activeTab}?page=${page}&pageSize=6`);
        setTabData((prev) => ({
          ...prev,
          [activeTab]: {
            items: res.data?.items || [],
            page: res.data?.page || page,
            totalPages: res.data?.totalPages || 1
          }
        }));
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Съдържанието на профила не може да се зареди.");
      }
    };

    fetchTab();
  }, [activeTab, id, tabData[activeTab].page]);

  const tab = tabData[activeTab];
  const tabTitle = useMemo(() => {
    if (activeTab === "threads") return "Теми";
    if (activeTab === "posts") return "Публикации";
    return "Маркери";
  }, [activeTab]);

  const changePage = (nextPage) => {
    setTabData((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        page: nextPage
      }
    }));
  };

  const renderTabItems = () => {
    if (!tab.items.length) {
      return <p className="muted">Все още няма {tabTitle.toLowerCase()}.</p>;
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
          <strong>{item.title || item.threadTitle || "Публикация"}</strong>
          <p>{item.content}</p>
          <span className="muted">{formatDateTime(item.createdAt)}</span>
        </Link>
      ));
    }

    return tab.items.map((item) => (
      <div key={item.pinId} className="profile-item">
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
        <span className="muted">{formatDateTime(item.createdAt)}</span>
      </div>
    ));
  };

  return (
    <div className="page-shell user-profile-page">
      {error && <p className="error-msg">{error}</p>}

      {profile && (
        <section className="card card-pad user-profile-card">
          <div className="profile-content">
            <div className="profile-avatar-wrap">
              <img src={profile.photoUrl || "/avatar-placeholder.svg"} alt="Профил" />
            </div>
            <div>
              <h2>{profile.username}</h2>
              <p className="muted">{profile.email}</p>
              <span className="tag tag-secondary">{toBgRole(profile.role)}</span>
              <p className="muted">
                Теми {profile.threadsCount || 0} - Публикации {profile.postsCount || 0} - Маркери {profile.pinsCount || 0}
              </p>
              <Link
                to={`/report?type=User&id=${id}&label=${encodeURIComponent(
                  profile.username || "Потребител"
                )}&returnTo=${encodeURIComponent(location.pathname)}`}
                className="btn btn-danger btn-sm"
              >
                Докладвай потребителя
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="card card-pad user-profile-content">
        <div className="split-row">
          <h3>{tabTitle}</h3>
          <div className="profile-tabs">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${activeTab === "threads" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("threads")}
            >
              Теми
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${activeTab === "posts" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("posts")}
            >
              Публикации
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${activeTab === "pins" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("pins")}
            >
              Маркери
            </button>
          </div>
        </div>

        <div className="profile-items">{renderTabItems()}</div>

        <div className="profile-pagination">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={tab.page <= 1}
            onClick={() => changePage(tab.page - 1)}
          >
            Назад
          </button>
          <span className="pill">
            Страница {tab.page} / {tab.totalPages || 1}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={tab.page >= (tab.totalPages || 1)}
            onClick={() => changePage(tab.page + 1)}
          >
            Напред
          </button>
        </div>
      </section>
    </div>
  );
}
