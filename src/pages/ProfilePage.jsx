import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { getApiErrorMessage } from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgRole } from "../utils/localize";
import "./ProfilePage.css";

const initialTabs = {
  threads: { items: [], page: 1, totalPages: 1 },
  posts: { items: [], page: 1, totalPages: 1 },
  pins: { items: [], page: 1, totalPages: 1 }
};

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [activeTab, setActiveTab] = useState("threads");
  const [tabData, setTabData] = useState(initialTabs);

  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("success");

  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/profile");
        setProfile(res.data);
        setUsername(res.data?.username || "");
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || "Неуспешно зареждане на профила.";
        setStatusType("error");
        setStatus(message);
        toast?.error(message);
      }
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    if (!profile?.id) return;

    const loadTab = async () => {
      const page = tabData[activeTab].page;
      try {
        const res = await api.get(`/user/public/${profile.id}/${activeTab}?page=${page}&pageSize=6`);
        setTabData((prev) => ({
          ...prev,
          [activeTab]: {
            items: res.data?.items || [],
            page: res.data?.page || page,
            totalPages: res.data?.totalPages || 1
          }
        }));
      } catch (err) {
        setStatusType("error");
        setStatus(err?.response?.data?.message || err?.message || "Неуспешно зареждане на съдържанието.");
      }
    };

    loadTab();
  }, [profile?.id, activeTab, tabData[activeTab].page]);

  const handleSaveChanges = async () => {
    setStatus("");

    try {
      if (!profile?.id) return;

      const trimmedUsername = username.trim();
      const usernameChanged = trimmedUsername && trimmedUsername !== profile.username;

      if (trimmedUsername && !USERNAME_PATTERN.test(trimmedUsername)) {
        const message = "Потребителското име може да съдържа само латински букви, цифри и символите . _ -.";
        setStatusType("error");
        setStatus(message);
        toast?.error(message);
        return;
      }

      if (!usernameChanged && !photoFile) {
        setStatusType("success");
        setStatus("Няма нови промени по профила.");
        return;
      }

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) {
          setStatusType("error");
          setStatus("Разрешени са само изображения.");
          return;
        }
        if (photoFile.size > 5 * 1024 * 1024) {
          setStatusType("error");
          setStatus("Снимката трябва да е до 5MB.");
          return;
        }
      }

      const formData = new FormData();
      if (usernameChanged) {
        formData.append("Username", trimmedUsername);
      }
      if (photoFile) {
        formData.append("File", photoFile);
      }

      const profileRes = await api.put("/user/profile", formData);
      const updatedProfile = profileRes.data;

      setPhotoFile(null);
      setPhotoPreview("");
      setProfile(updatedProfile);
      setUsername(updatedProfile.username || username);
      refreshUser?.().catch(() => {});
      setStatusType("success");
      setStatus("Данните по профила са обновени.");
      toast?.success("Профилът е обновен успешно.");
    } catch (err) {
      const message = getApiErrorMessage(err, "Неуспешно обновяване на профила.");
      setStatusType("error");
      setStatus(message);
      toast?.error(message);
    }
  };

  const changeTabPage = (nextPage) => {
    setTabData((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        page: nextPage
      }
    }));
  };

  const currentTab = tabData[activeTab];

  const tabTitle = useMemo(() => {
    if (activeTab === "threads") return "Теми";
    if (activeTab === "posts") return "Публикации";
    return "Пинове";
  }, [activeTab]);

  const renderTabItems = () => {
    if (!currentTab?.items?.length) {
      return <p className="muted">Все още няма {tabTitle.toLowerCase()}.</p>;
    }

    if (activeTab === "threads") {
      return currentTab.items.map((item) => (
        <Link key={item.threadId} to={`/threads/${item.threadId}`} className="profile-content-item">
          <strong>{item.title}</strong>
          <span className="muted">{formatDateTime(item.lastPostAt || item.createdAt)}</span>
        </Link>
      ));
    }

    if (activeTab === "posts") {
      return currentTab.items.map((item) => (
        <Link key={item.postId} to={`/threads/${item.threadId}?postId=${item.postId}`} className="profile-content-item">
          <strong>{item.title || item.threadTitle || "Публикация"}</strong>
          <p>{item.content}</p>
          <span className="muted">{formatDateTime(item.createdAt)}</span>
        </Link>
      ));
    }

    return currentTab.items.map((item) => (
      <Link key={item.pinId} to={`/map?pinId=${item.pinId}`} className="profile-content-item">
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
        <span className="muted">
          {item.category || "Без категория"}
          {item.layerLabel ? ` · ${item.layerLabel}` : ""}
          {item.zoneLabel ? ` · ${item.zoneLabel}` : ""}
        </span>
        <span className="muted">{formatDateTime(item.createdAt)}</span>
      </Link>
    ));
  };

  if (loading || !user?.id) {
    return (
      <div className="page-shell">
        <div className="card card-pad">
          <p className="muted">Зареждане на профила...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <div className="card card-pad">
          <p className="muted">Няма налични данни за профила.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell profile-page">
      <section className="profile-layout">
        <article className="card card-pad profile-card">
          <div className="profile-photo-wrap">
            <img
              src={photoPreview || profile.photoUrl || "/avatar-placeholder.svg"}
              alt="Профил"
              className="profile-photo"
            />
          </div>
          <h2>{profile.username}</h2>
          <p className="muted">{profile.email}</p>
          <span className="tag tag-secondary">{toBgRole(profile.role)}</span>

          <div className="profile-stats">
            <div><strong>{profile.threadsCount || 0}</strong>Теми</div>
            <div><strong>{profile.postsCount || 0}</strong>Публикации</div>
            <div><strong>{profile.pinsCount || 0}</strong>Пинове</div>
          </div>
        </article>

        <article className="card card-pad profile-editor">
          <h3>Данни за акаунта</h3>
          <p className="muted">
            Обнови потребителско име и профилна снимка. Можеш да правиш до 3 профилни промени за 24 часа.
          </p>

          {status && (
            <p className={statusType === "error" ? "error-msg" : "success-msg"}>{status}</p>
          )}

          <div className="form-grid">
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Потребителско име"
            />
            <p className="profile-input-hint">
              Разрешени символи: латински букви, цифри, точка, долна черта и тире.
            </p>

            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />

            <button className="btn btn-primary" type="button" onClick={handleSaveChanges}>
              Запази промените
            </button>
          </div>
        </article>
      </section>

      <section className="card card-pad profile-content-panel">
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
              Пинове
            </button>
          </div>
        </div>

        <div className="profile-content-list">{renderTabItems()}</div>

        <div className="profile-pagination">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={currentTab.page <= 1}
            onClick={() => changeTabPage(currentTab.page - 1)}
          >
            Назад
          </button>
          <span className="pill">
            Страница {currentTab.page} / {currentTab.totalPages || 1}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={currentTab.page >= (currentTab.totalPages || 1)}
            onClick={() => changeTabPage(currentTab.page + 1)}
          >
            Напред
          </button>
        </div>
      </section>
    </div>
  );
}
