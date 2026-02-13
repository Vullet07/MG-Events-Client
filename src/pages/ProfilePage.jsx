import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import { Link } from "react-router-dom";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("threads");
  const [tabData, setTabData] = useState({
    threads: { items: [], page: 1, totalPages: 1 },
    posts: { items: [], page: 1, totalPages: 1 },
    pins: { items: [], page: 1, totalPages: 1 }
  });

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/profile");
        setProfile(res.data);
        setUsername(res.data.username || "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleSaveChanges = async () => {
    try {
      if (!profile?.id) return;
      const payload = {
        username: username.trim()
      };
      const res = await api.put(`/user/${profile.id}`, payload);
      let updatedProfile = res.data;

      if (photoFile) {
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
        updatedProfile = uploadRes.data;
        setPhotoFile(null);
        setPhotoPreview("");
      }

      setProfile(updatedProfile);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err?.message || "Failed to update profile.");
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

  useEffect(() => {
    if (!profile?.id) return;
    const loadTab = async () => {
      try {
        const page = tabData[activeTab].page;
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
        setMessage(err?.message || "Failed to load account content.");
      }
    };
    loadTab();
  }, [profile?.id, activeTab, tabData[activeTab].page]);

  const changeTabPage = (nextPage) => {
    setTabData((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], page: nextPage }
    }));
  };

  const currentTab = tabData[activeTab];

  const renderTabItems = () => {
    if (currentTab.items.length === 0) {
      return <p className="muted">No {activeTab} yet.</p>;
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
        <Link key={item.postId} to={`/threads/${item.threadId}`} className="profile-content-item">
          <strong>{item.title || item.threadTitle}</strong>
          <p>{item.content}</p>
          <span className="muted">{formatDateTime(item.createdAt)} | Score {item.score}</span>
        </Link>
      ));
    }

    return currentTab.items.map((item) => (
      <div key={item.pinId} className="profile-content-item">
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
        <span className="muted">{formatDateTime(item.createdAt)} | Score {item.score}</span>
      </div>
    ));
  };

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
          <div className="profile-stats">
            <div><strong>{profile.threadsCount || 0}</strong> threads</div>
            <div><strong>{profile.postsCount || 0}</strong> posts</div>
            <div><strong>{profile.pinsCount || 0}</strong> pins</div>
          </div>
        </div>

        <div className="card card-pad profile-editor">
          <h3>Account Settings</h3>
          <p className="muted">Update your account details.</p>
          {message && <p className="success-msg">{message}</p>}
          <div className="form-grid">
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="photo-preview" />
            )}
            <button className="btn btn-primary" onClick={handleSaveChanges}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="card card-pad profile-content-panel">
        <h3>Your Activity</h3>
        <div className="profile-tabs">
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "threads" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("threads")}
          >
            Threads
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "posts" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${activeTab === "pins" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("pins")}
          >
            Pins
          </button>
        </div>

        <div className="profile-content-list">{renderTabItems()}</div>

        <div className="profile-pagination">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={currentTab.page <= 1}
            onClick={() => changeTabPage(currentTab.page - 1)}
          >
            Prev
          </button>
          <span className="pill">
            Page {currentTab.page} / {currentTab.totalPages || 1}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={currentTab.page >= (currentTab.totalPages || 1)}
            onClick={() => changeTabPage(currentTab.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
