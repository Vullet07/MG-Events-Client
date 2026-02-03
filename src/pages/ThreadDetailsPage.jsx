import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import "./ThreadDetailsPage.css";

export default function ThreadDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [creator, setCreator] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);

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
        const postsRes = await api.get(`/forum-posts/thread/${id}`);
        setPosts(postsRes.data?.items || postsRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchThread();
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newPost) return;
    setLoading(true);
    try {
      const res = await api.post("/forum-posts", {
        title: newTitle || null,
        photoUrl: newPhotoUrl || null,
        content: newPost,
        threadId: id,
      });
      setPosts([...posts, res.data]);
      setNewTitle("");
      setNewPhotoUrl("");
      setNewPost("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!thread) return <p>Loading...</p>;

  return (
    <div className="page-shell">
      <div className="thread-header card card-pad">
        <div>
          <h2 className="section-title">{thread.title}</h2>
          <p className="section-subtitle">
            Created by{" "}
            <Link className="link" to={`/users/${thread.createdByUserId}`}>
              {creator?.username || `User ${thread.createdByUserId}`}
            </Link>{" "}
            {creator?.role && <span className="pill">{creator.role}</span>}
          </p>
        </div>
        <div className="thread-header__tags">
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
          posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-meta">
                <span className="pill">#{post.id}</span>
                <Link to={`/users/${post.userId}`} className="link">
                  User {post.userId}
                </Link>
                <span className="muted">{post.createdAt}</span>
              </div>
              {post.title && <h3 className="post-title">{post.title}</h3>}
              {post.photoUrl && (
                <img src={post.photoUrl} alt="Post" className="post-photo" />
              )}
              <p>{post.content}</p>
            </div>
          ))
        )}
      </div>

      {!thread.isLocked && user && (
        <form onSubmit={handleReply} className="reply-form card card-pad">
          <h3>Reply to this thread</h3>
          <div className="form-grid">
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Optional title"
            />
            <input
              className="input"
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              placeholder="Optional photo URL"
            />
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
    </div>
  );
}
