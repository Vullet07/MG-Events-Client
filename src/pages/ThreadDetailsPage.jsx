import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/formatDateTime";
import "./ThreadDetailsPage.css";

export default function ThreadDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [creator, setCreator] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [newTitle, setNewTitle] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState("");
  const [newPost, setNewPost] = useState("");
  const [parentPostId, setParentPostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleImages, setVisibleImages] = useState({});
  const [imageSizes, setImageSizes] = useState({});
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    const fetchThread = async () => {
      try {
        const res = await api.get(`/forum-threads/${id}`);
        setThread(res.data);
        try {
          const userRes = await api.get(`/user/public/${res.data.createdByUserId}`);
          setCreator(userRes.data);
        } catch (userErr) {
          console.error(userErr);
        }
        const postsRes = await api.get(`/ForumPosts/thread/${id}`);
        setPosts(postsRes.data?.items || postsRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchThread();
  }, [id]);

  useEffect(() => {
    const fetchUsers = async () => {
      const ids = new Set(posts.map((p) => p.userId));
      if (thread?.createdByUserId) ids.add(thread.createdByUserId);
      const idList = Array.from(ids);
      if (!idList.length) return;
      const missing = idList.filter((userId) => !userMap[userId]);
      if (!missing.length) return;
      const entries = await Promise.all(
        missing.map(async (userId) => {
          try {
            const res = await api.get(`/user/public/${userId}`);
            return [
              userId,
              {
                username: res.data?.username,
                photoUrl: res.data?.photoUrl
              }
            ];
          } catch (err) {
            return [userId, null];
          }
        })
      );
      setUserMap((prev) => {
        const next = { ...prev };
        entries.forEach(([userId, info]) => {
          if (info) next[userId] = info;
        });
        return next;
      });
    };
    fetchUsers();
  }, [posts, thread, userMap]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", newTitle || "");
      formData.append("content", newPost);
      formData.append("threadId", String(Number(id)));
      if (parentPostId) formData.append("parentPostId", String(parentPostId));
      if (newPhotoFile) formData.append("photo", newPhotoFile);

      const res = await api.post("/ForumPosts", formData);
      setPosts([...posts, res.data]);
      setNewTitle("");
      setNewPhotoFile(null);
      setNewPhotoPreview("");
      setNewPost("");
      setParentPostId(null);
    } catch (err) {
      setError(err?.message || "Failed to post reply.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostVote = async (postId, value) => {
    try {
      await api.post(`/ForumPosts/${postId}/vote`, { value });
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
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
      setError(err?.message || "Failed to vote.");
    }
  };

  useEffect(() => {
    if (!newPhotoFile) {
      setNewPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(newPhotoFile);
    setNewPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [newPhotoFile]);

  const handlePhotoChange = (file) => {
    if (!file) {
      setNewPhotoFile(null);
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
    setNewPhotoFile(file);
  };

  const buildTree = (items) => {
    const map = new Map();
    items.forEach((item) => map.set(item.id, { ...item, replies: [] }));
    const roots = [];
    map.forEach((node) => {
      if (node.parentPostId && map.has(node.parentPostId)) {
        map.get(node.parentPostId).replies.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const toggleImage = (postId) => {
    setVisibleImages((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleImageLoad = (postId, e) => {
    const { naturalWidth, naturalHeight } = e.target;
    const width = Math.max(120, Math.round(naturalWidth / 2));
    const height = Math.max(120, Math.round(naturalHeight / 2));
    setImageSizes((prev) => ({
      ...prev,
      [postId]: { width, height, naturalWidth, naturalHeight }
    }));
  };

  const openImage = (postId, url) => {
    const size = imageSizes[postId];
    if (!size) {
      setActiveImage({ url });
      return;
    }
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;
    const scale = Math.min(maxW / size.naturalWidth, maxH / size.naturalHeight, 1);
    setActiveImage({
      url,
      width: Math.round(size.naturalWidth * scale),
      height: Math.round(size.naturalHeight * scale)
    });
  };

  const renderPosts = (items, depth = 0) =>
    items.map((post) => (
      <div key={post.id} className={`post-card depth-${depth}`}>
        <div className="post-meta">
          <div className="post-author">
            <img
              src={
                userMap[post.userId]?.photoUrl ||
                "/avatar-placeholder.svg"
              }
              alt="Author"
              className="post-avatar"
            />
            <Link to={`/users/${post.userId}`} className="link">
              {userMap[post.userId]?.username || "Unknown user"}
            </Link>
          </div>
          <span className="muted">{formatDateTime(post.createdAt)}</span>
        </div>
        {post.parentPostId && (
          <div className="reply-pill">Reply to another post</div>
        )}
        {post.title && <h3 className="post-title">{post.title}</h3>}
        {post.photoUrl && (
          <div className="post-photo-wrap">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => toggleImage(post.id)}
            >
              {visibleImages[post.id] ? "Hide Photo" : "Show Photo"}
            </button>
            {visibleImages[post.id] && (
              <img
                src={post.photoUrl}
                alt="Post"
                className="post-photo"
                onLoad={(e) => handleImageLoad(post.id, e)}
                onClick={() => openImage(post.id, post.photoUrl)}
                style={
                  imageSizes[post.id]
                    ? {
                        width: `${imageSizes[post.id].width}px`,
                        height: `${imageSizes[post.id].height}px`
                      }
                    : undefined
                }
              />
            )}
          </div>
        )}
        <p>{post.content}</p>
        <div className="post-votes">
          <button
            className={`btn btn-ghost ${post.myVote === 1 ? "vote-active" : ""}`}
            type="button"
            onClick={() => handlePostVote(post.id, 1)}
          >
            <span aria-hidden="true">👍</span> {post.upvotes || 0}
          </button>
          <button
            className={`btn btn-ghost ${post.myVote === -1 ? "vote-active" : ""}`}
            type="button"
            onClick={() => handlePostVote(post.id, -1)}
          >
            <span aria-hidden="true">👎</span> {post.downvotes || 0}
          </button>
          <span className="pill">Score {post.score || 0}</span>
          <Link
            className="btn btn-danger"
            to={`/report?type=Post&id=${post.id}&label=${encodeURIComponent(post.title || post.content?.slice(0, 40) || "Post")}&returnTo=${encodeURIComponent(location.pathname)}`}
          >
            Report
          </Link>
        </div>
        <button
          className="btn btn-ghost reply-btn"
          type="button"
          onClick={() => setParentPostId(post.id)}
        >
          Reply to this post
        </button>
        {post.replies?.length > 0 && (
          <div className="post-replies">{renderPosts(post.replies, depth + 1)}</div>
        )}
      </div>
    ));

  if (!thread) return <p>Loading...</p>;

  return (
    <div className="page-shell">
      <div className="thread-header card card-pad">
        <div>
          <h2 className="section-title">{thread.title}</h2>
          <p className="section-subtitle">
            Created by{" "}
            <Link className="link" to={`/users/${thread.createdByUserId}`}>
              {creator?.username ||
                thread.createdByUsername ||
                userMap[thread.createdByUserId]?.username ||
                "Unknown user"}
            </Link>{" "}
            {(creator?.role || thread.createdByRole) && (
              <span className="pill">{creator?.role || thread.createdByRole}</span>
            )}
          </p>
        </div>
        <div className="thread-header__tags">
          <Link
            className="btn btn-ghost"
            to={`/report?type=Thread&id=${thread.id}&label=${encodeURIComponent(thread.title || "Thread")}&returnTo=${encodeURIComponent(location.pathname)}`}
          >
            Report Thread
          </Link>
          {thread.isPinned && <span className="tag">Pinned</span>}
          {thread.isLocked && <span className="tag tag-danger">Locked</span>}
        </div>
      </div>

      {thread.isLocked && (
        <div className="locked-banner">This thread is locked.</div>
      )}

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="card card-pad empty-state">
            <h3>No posts yet</h3>
            <p className="muted">Be the first to reply to this thread.</p>
          </div>
        ) : (
          renderPosts(buildTree(posts))
        )}
      </div>

      {!thread.isLocked && user && (
        <form onSubmit={handleReply} className="reply-form card card-pad">
          <h3>Reply to this thread</h3>
          {parentPostId && (
            <div className="replying-banner">
              Replying to selected post
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setParentPostId(null)}
              >
                Cancel
              </button>
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
          <div className="form-grid">
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Optional title"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
            />
            {newPhotoPreview && (
              <img src={newPhotoPreview} alt="Preview" className="photo-preview" />
            )}
            <textarea
              className="textarea"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Write your reply..."
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Posting..." : "Post Reply"}
          </button>
        </form>
      )}

      {activeImage && (
        <div className="image-modal" onClick={() => setActiveImage(null)}>
          <button
            className="image-modal__close"
            type="button"
            onClick={() => setActiveImage(null)}
          >
            Close
          </button>
          <img
            src={activeImage.url}
            alt="Full"
            className="image-modal__img"
            style={
              activeImage.width && activeImage.height
                ? { width: activeImage.width, height: activeImage.height }
                : undefined
            }
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
