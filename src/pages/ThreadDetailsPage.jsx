import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgRole } from "../utils/localize";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton, SkeletonLines } from "../components/ui/Skeleton";
import "./ThreadDetailsPage.css";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export default function ThreadDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const replyFormRef = useRef(null);
  const postRefs = useRef(new Map());

  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [creator, setCreator] = useState(null);
  const [userMap, setUserMap] = useState({});

  const [newTitle, setNewTitle] = useState("");
  const [newPost, setNewPost] = useState("");
  const [parentPostId, setParentPostId] = useState(null);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState("");
  const [editingThread, setEditingThread] = useState(false);
  const [threadTitleDraft, setThreadTitleDraft] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostPhotoFile, setEditPostPhotoFile] = useState(null);
  const [editPostPhotoPreview, setEditPostPhotoPreview] = useState("");
  const [removeEditPostPhoto, setRemoveEditPostPhoto] = useState(false);

  const [openActionsPostId, setOpenActionsPostId] = useState(null);
  const [visibleImages, setVisibleImages] = useState({});
  const [imageSizes, setImageSizes] = useState({});
  const [activeImage, setActiveImage] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);

  const [postSort, setPostSort] = useState("newest");
  const [highlightPostId, setHighlightPostId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [loadingThread, setLoadingThread] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reportReturnTo = `${location.pathname}${location.search || ""}`;

  useEffect(() => {
    const fetchThreadData = async () => {
      try {
        setLoadingThread(true);
        setError("");

        const [threadRes, postsRes] = await Promise.all([
          api.get(`/forum-threads/${id}`),
          api.get(`/ForumPosts/thread/${id}`)
        ]);

        const threadData = threadRes.data;
        setThread(threadData);
        setPosts(postsRes.data?.items || postsRes.data || []);

        if (threadData?.createdByUserId) {
          try {
            const creatorRes = await api.get(`/user/public/${threadData.createdByUserId}`);
            setCreator(creatorRes.data);
          } catch {
            setCreator(null);
          }
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на темата.");
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThreadData();
  }, [id]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!thread && posts.length === 0) return;

      const ids = new Set(posts.map((post) => post.userId).filter(Boolean));
      if (thread?.createdByUserId) ids.add(thread.createdByUserId);

      const missing = Array.from(ids).filter((userId) => !userMap[userId]);
      if (!missing.length) return;

      const entries = await Promise.all(
        missing.map(async (userId) => {
          try {
            const res = await api.get(`/user/public/${userId}`);
            return [
              userId,
              {
                username: res.data?.username,
                photoUrl: res.data?.photoUrl,
                role: res.data?.role
              }
            ];
          } catch {
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

  useEffect(() => {
    if (!newPhotoFile) {
      setNewPhotoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(newPhotoFile);
    setNewPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [newPhotoFile]);

  useEffect(() => {
    setThreadTitleDraft(thread?.title || "");
  }, [thread?.title]);

  useEffect(() => {
    if (!editPostPhotoFile) {
      setEditPostPhotoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(editPostPhotoFile);
    setEditPostPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [editPostPhotoFile]);

  useEffect(() => {
    const targetPostId = Number(searchParams.get("postId"));
    if (!Number.isInteger(targetPostId) || targetPostId <= 0 || posts.length === 0) return undefined;

    const node = postRefs.current.get(targetPostId);
    if (!node) return undefined;

    setHighlightPostId(targetPostId);
    node.scrollIntoView({ behavior: "smooth", block: "center" });

    const timeoutId = window.setTimeout(() => {
      setHighlightPostId((current) => (current === targetPostId ? null : current));
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [posts, searchParams]);

  useEffect(() => {
    if (!deleteDialog) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) setDeleteDialog(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialog, loading]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (postSort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (postSort === "top") return (b.score || 0) - (a.score || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [posts, postSort]);

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

  const postTree = useMemo(() => buildTree(sortedPosts), [sortedPosts]);
  const isModerator = user?.role === "Admin" || user?.role === "Teacher";
  const isThreadOwner = Number(user?.id) === Number(thread?.createdByUserId);
  const canManageThread = !!user && (isThreadOwner || isModerator);
  const canPinThread = !!user && isModerator;
  const isNewsThread = /^\[(news|новина)\]/i.test(thread?.title || "");

  const handlePhotoChange = (file) => {
    if (!file) {
      setNewPhotoFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Разрешени са само изображения.");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError("Снимката трябва да е до 5MB.");
      return;
    }

    setError("");
    setNewPhotoFile(file);
  };

  const scrollToReplyForm = () => {
    replyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError("Заглавието на публикацията е задължително.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", newTitle.trim());
      formData.append("content", newPost.trim());
      formData.append("threadId", String(Number(id)));
      if (parentPostId) formData.append("parentPostId", String(parentPostId));
      if (newPhotoFile) formData.append("photo", newPhotoFile);

      const res = await api.post("/ForumPosts", formData);
      setPosts((prev) => [...prev, res.data]);
      setNewTitle("");
      setNewPost("");
      setParentPostId(null);
      setNewPhotoFile(null);
      setNewPhotoPreview("");
      setOpenActionsPostId(null);
      toast?.success("Отговорът е публикуван.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно публикуване на отговор.");
    } finally {
      setLoading(false);
    }
  };

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setEditPostTitle(post.title || "");
    setEditPostContent(post.content || "");
    setEditPostPhotoFile(null);
    setEditPostPhotoPreview("");
    setRemoveEditPostPhoto(false);
    setOpenActionsPostId(null);
  };

  const resetPostEditor = () => {
    setEditingPostId(null);
    setEditPostTitle("");
    setEditPostContent("");
    setEditPostPhotoFile(null);
    setEditPostPhotoPreview("");
    setRemoveEditPostPhoto(false);
  };

  const handleEditPostPhotoChange = (file) => {
    if (!file) {
      setEditPostPhotoFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Разрешени са само изображения.");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError("Снимката трябва да е до 5MB.");
      return;
    }

    setError("");
    setEditPostPhotoFile(file);
    setRemoveEditPostPhoto(false);
  };

  const handleUpdateThread = async (event) => {
    event.preventDefault();
    if (!threadTitleDraft.trim()) {
      setError("Заглавието е задължително.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextTitle = isNewsThread && !/^\[(news|новина)\]/i.test(threadTitleDraft.trim())
        ? `[News] ${threadTitleDraft.trim()}`
        : threadTitleDraft.trim();

      const response = await api.put(`/forum-threads/${id}`, { title: nextTitle });
      setThread(response.data);
      setEditingThread(false);
      toast?.success("Темата е обновена.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно обновяване на темата.");
    } finally {
      setLoading(false);
    }
  };

  const handleThreadState = async (action) => {
    setLoading(true);
    setError("");

    try {
      await api.put(`/forum-threads/${id}/${action}`);
      setThread((prev) => {
        if (!prev) return prev;
        if (action === "lock") return { ...prev, isLocked: true };
        if (action === "unlock") return { ...prev, isLocked: false };
        if (action === "pin") return { ...prev, isPinned: true };
        if (action === "unpin") return { ...prev, isPinned: false };
        return prev;
      });
      toast?.success("Статусът на темата е обновен.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешна промяна на статуса на темата.");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteThread = () => {
    setDeleteDialog({
      type: "thread",
      title: thread?.title || "тази тема"
    });
  };

  const requestDeletePost = (post) => {
    setOpenActionsPostId(post.id);
    setDeleteDialog({
      type: "post",
      postId: post.id,
      title: post.title || post.content?.slice(0, 70) || "тази публикация"
    });
  };

  const closeDeleteDialog = () => {
    if (!loading) setDeleteDialog(null);
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    setLoading(true);
    setError("");

    try {
      if (deleteDialog.type === "thread") {
        await api.delete(`/forum-threads/${id}`);
        setDeleteDialog(null);
        toast?.success("Темата е изтрита.");
        navigate(isNewsThread ? "/news" : "/threads");
        return;
      }

      await api.delete(`/ForumPosts/${deleteDialog.postId}`);
      setPosts((prev) => prev.filter((post) => post.id !== deleteDialog.postId));
      resetPostEditor();
      setDeleteDialog(null);
      toast?.success("Публикацията е изтрита.");
    } catch (err) {
      const fallback = deleteDialog.type === "thread"
        ? "Неуспешно изтриване на темата."
        : "Неуспешно изтриване на публикацията.";
      setError(err?.response?.data?.message || err?.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePost = async (postId) => {
    if (!editPostTitle.trim()) {
      setError("Заглавието на публикацията е задължително.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", editPostTitle.trim());
      formData.append("content", editPostContent.trim());
      formData.append("removePhoto", removeEditPostPhoto ? "true" : "false");
      if (editPostPhotoFile) formData.append("photo", editPostPhotoFile);

      const response = await api.put(`/ForumPosts/${postId}`, formData);
      setPosts((prev) => prev.map((post) => (post.id === postId ? response.data : post)));
      resetPostEditor();
      toast?.success("Публикацията е обновена.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно обновяване на публикацията.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostVote = async (postId, value) => {
    try {
      await api.post(`/ForumPosts/${postId}/vote`, { value });
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const oldVote = post.myVote || 0;
          const nextVote = oldVote === value ? 0 : value;
          const upDelta = (nextVote === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0);
          const downDelta = (nextVote === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0);

          return {
            ...post,
            myVote: nextVote,
            upvotes: (post.upvotes || 0) + upDelta,
            downvotes: (post.downvotes || 0) + downDelta,
            score: (post.score || 0) + upDelta - downDelta
          };
        })
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно гласуване за публикация.");
    }
  };

  const toggleImage = (postId) => {
    setVisibleImages((prev) => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleImageLoad = (postId, e) => {
    const { naturalWidth, naturalHeight } = e.target;
    const maxWidth = 560;
    const scale = Math.min(1, maxWidth / naturalWidth);

    setImageSizes((prev) => ({
      ...prev,
      [postId]: {
        width: Math.round(naturalWidth * scale),
        height: Math.round(naturalHeight * scale),
        naturalWidth,
        naturalHeight
      }
    }));
  };

  const openImage = (postId, url) => {
    const size = imageSizes[postId];
    if (size) {
      setActiveImage({
        url,
        width: size.naturalWidth,
        height: size.naturalHeight
      });
    } else {
      setActiveImage({ url });
    }
    setImageZoom(1);
  };

  const closeImageModal = () => {
    setActiveImage(null);
    setImageZoom(1);
  };

  const updateZoom = (updater) => {
    setImageZoom((prev) => {
      const nextValue = typeof updater === "function" ? updater(prev) : updater;
      return Math.min(4, Math.max(0.4, Number(nextValue) || 1));
    });
  };

  const renderPosts = (items, depth = 0) =>
    items.map((post) => (
      (() => {
        const canManagePost = Number(user?.id) === Number(post.userId) || isModerator;
        const isEditingThisPost = editingPostId === post.id;

        return (
      <article
        key={post.id}
        ref={(node) => {
          if (node) {
            postRefs.current.set(post.id, node);
          } else {
            postRefs.current.delete(post.id);
          }
        }}
        className={`post-card depth-${Math.min(depth, 3)}${highlightPostId === post.id ? " post-card-highlight" : ""}`}
      >
        <header className="post-meta">
          <div className="post-author">
            <img
              src={userMap[post.userId]?.photoUrl || "/avatar-placeholder.svg"}
              alt="Аватар"
              className="post-avatar"
            />
            <div>
              <Link to={`/users/${post.userId}`} className="link">
                {userMap[post.userId]?.username || post.username || "Неизвестен потребител"}
              </Link>
              <div className="muted">{formatDateTime(post.createdAt)}</div>
              {(userMap[post.userId]?.role || post.userRole) && (
                <span className="post-role-tag">{toBgRole(userMap[post.userId]?.role || post.userRole)}</span>
              )}
            </div>
          </div>

          <div className="post-actions-menu">
            <button
              type="button"
              className="post-actions-trigger"
              onClick={() => setOpenActionsPostId((prev) => (prev === post.id ? null : post.id))}
              aria-label="Още действия"
            >
              ⋯
            </button>

            {openActionsPostId === post.id && (
              <div className="post-actions-dropdown">
                <button
                  type="button"
                  className="post-actions-item"
                  onClick={() => {
                    setParentPostId(post.id);
                    setOpenActionsPostId(null);
                    scrollToReplyForm();
                  }}
                >
                  Отговори
                </button>

                {canManagePost && (
                  <button
                    type="button"
                    className="post-actions-item"
                    onClick={() => startEditingPost(post)}
                  >
                    Редактирай
                  </button>
                )}

                {canManagePost && (
                  <button
                    type="button"
                    className="post-actions-item"
                    onClick={() => requestDeletePost(post)}
                  >
                    Изтрий
                  </button>
                )}

                {deleteDialog?.type === "post" && deleteDialog.postId === post.id && (
                  <div className="post-actions-confirm">
                    <strong>Изтриване на публикацията?</strong>
                    <span>Това действие е необратимо.</span>
                    <div className="post-actions-confirm__actions">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={loading}
                        onClick={confirmDelete}
                      >
                        {loading ? "Изтриване..." : "Да, изтрий"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={loading}
                        onClick={closeDeleteDialog}
                      >
                        Откажи
                      </button>
                    </div>
                  </div>
                )}

                <Link
                  className="post-actions-item"
                  to={`/report?type=Post&id=${post.id}&label=${encodeURIComponent(
                    post.title || post.content?.slice(0, 40) || "Публикация"
                  )}&returnTo=${encodeURIComponent(reportReturnTo)}`}
                  onClick={() => setOpenActionsPostId(null)}
                >
                  Докладвай
                </Link>
              </div>
            )}
          </div>
        </header>

        {post.parentPostId && <span className="reply-pill">Отговор към друга публикация</span>}
        {post.title && <h3 className="post-title">{post.title}</h3>}

        {isEditingThisPost ? (
          <div className="form-grid reply-form-grid">
            <input
              className="input"
              value={editPostTitle}
              onChange={(event) => setEditPostTitle(event.target.value)}
              placeholder="Заглавие на публикацията"
            />
            <textarea
              className="textarea"
              value={editPostContent}
              onChange={(event) => setEditPostContent(event.target.value)}
              placeholder="Допълнително описание (по желание)"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(event) => handleEditPostPhotoChange(event.target.files?.[0] || null)}
            />
            {(editPostPhotoPreview || (post.photoUrl && !removeEditPostPhoto)) && (
              <img
                src={editPostPhotoPreview || post.photoUrl}
                alt="Преглед"
                className="photo-preview"
              />
            )}
            {post.photoUrl && !editPostPhotoPreview && (
              <label className="map-check">
                <input
                  type="checkbox"
                  checked={removeEditPostPhoto}
                  onChange={(event) => setRemoveEditPostPhoto(event.target.checked)}
                />
                Премахни снимката
              </label>
            )}
            <div className="thread-inline-actions">
              <button className="btn btn-primary btn-sm" type="button" onClick={() => handleUpdatePost(post.id)} disabled={loading}>
                {loading ? "Запазване..." : "Запази"}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={resetPostEditor}>
                Откажи
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.photoUrl && (
              <div className="post-photo-wrap">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleImage(post.id)}>
                  {visibleImages[post.id] ? "Скрий снимка" : "Покажи снимка"}
                </button>
                {visibleImages[post.id] && (
                  <img
                    src={post.photoUrl}
                    alt="Снимка към публикация"
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

            {post.content ? <p className="post-content">{post.content}</p> : null}
          </>
        )}

        <div className="post-votes">
          <button
            className={`btn btn-ghost btn-sm ${post.myVote === 1 ? "vote-active" : ""}`}
            type="button"
            onClick={() => handlePostVote(post.id, 1)}
          >
            <span aria-hidden="true">{"\uD83D\uDC4D"}</span> {post.upvotes || 0}
          </button>
          <button
            className={`btn btn-ghost btn-sm ${post.myVote === -1 ? "vote-active" : ""}`}
            type="button"
            onClick={() => handlePostVote(post.id, -1)}
          >
            <span aria-hidden="true">{"\uD83D\uDC4E"}</span> {post.downvotes || 0}
          </button>
        </div>

        {post.replies?.length > 0 && <div className="post-replies">{renderPosts(post.replies, depth + 1)}</div>}
      </article>
        );
      })()
    ));

  if (loadingThread) {
    return (
      <div className="page-shell">
        <div className="card card-pad">
          <Skeleton className="thread-skeleton-title" />
          <SkeletonLines lines={4} />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Темата не е налична"
          description="Възможно е да е изтрита или да нямаш достъп до нея."
          actionLabel="Към всички теми"
          actionTo="/threads"
        />
      </div>
    );
  }

  return (
    <div className="page-shell thread-details-page">
      <section className="thread-header card card-pad">
        <div>
          {editingThread ? (
            <form className="thread-title-form" onSubmit={handleUpdateThread}>
              <input
                className="input"
                value={threadTitleDraft}
                onChange={(event) => setThreadTitleDraft(event.target.value)}
                placeholder="Заглавие на темата"
              />
              <div className="thread-inline-actions">
                <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
                  {loading ? "Запазване..." : "Запази"}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingThread(false)}>
                  Откажи
                </button>
              </div>
            </form>
          ) : (
            <h2 className="section-title">{thread.title}</h2>
          )}
          <p className="section-subtitle">
            Създадена от{" "}
            <Link className="link" to={`/users/${thread.createdByUserId}`}>
              {creator?.username || thread.createdByUsername || userMap[thread.createdByUserId]?.username || "Неизвестен потребител"}
            </Link>
            {" - "}
            {formatDateTime(thread.createdAt)}
          </p>
        </div>

        <div className="thread-header__tags">
          {(creator?.role || thread.createdByRole) && (
            <span className="tag tag-secondary">{toBgRole(creator?.role || thread.createdByRole)}</span>
          )}
          {thread.isPinned && <span className="tag">Закачена</span>}
          {thread.isLocked && <span className="tag tag-danger">Заключена</span>}
          {canManageThread && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingThread((prev) => !prev)}>
              {editingThread ? "Скрий редакция" : "Редактирай"}
            </button>
          )}
          {canManageThread && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => handleThreadState(thread.isLocked ? "unlock" : "lock")}
            >
              {thread.isLocked ? "Отключи" : "Заключи"}
            </button>
          )}
          {canPinThread && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => handleThreadState(thread.isPinned ? "unpin" : "pin")}
            >
              {thread.isPinned ? "Откачи" : "Закачи"}
            </button>
          )}
          {canManageThread && (
            <div className="thread-delete-action">
              <button className="btn btn-danger btn-sm" type="button" onClick={requestDeleteThread}>
                Изтрий темата
              </button>
              {deleteDialog?.type === "thread" && (
                <div className="thread-delete-confirm">
                  <strong>Изтриване на темата?</strong>
                  <span>Темата и всички нейни публикации ще бъдат премахнати.</span>
                  <div className="thread-delete-confirm__actions">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={loading}
                      onClick={confirmDelete}
                    >
                      {loading ? "Изтриване..." : "Да, изтрий"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={loading}
                      onClick={closeDeleteDialog}
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <Link
            className="btn btn-danger btn-sm"
            to={`/report?type=Thread&id=${thread.id}&label=${encodeURIComponent(
              thread.title || "Тема"
            )}&returnTo=${encodeURIComponent(reportReturnTo)}`}
          >
            Докладвай темата
          </Link>
        </div>
      </section>

      {thread.isLocked && <p className="locked-banner">Темата е заключена и не приема нови отговори.</p>}
      {error && <p className="error-msg">{error}</p>}

      <section className="thread-toolbar card card-pad">
        <span className="pill">Публикации: {posts.length}</span>
        <select value={postSort} onChange={(e) => setPostSort(e.target.value)}>
          <option value="newest">Най-нови първо</option>
          <option value="oldest">Най-стари първо</option>
          <option value="top">Най-висока оценка</option>
        </select>
      </section>

      <section className="posts-list">
        {postTree.length === 0 ? (
          <EmptyState
            title="Все още няма публикации"
            description="Бъди първият, който ще отговори в тази тема."
            actionLabel={!thread.isLocked && user ? "Напиши отговор" : undefined}
            actionOnClick={!thread.isLocked && user ? scrollToReplyForm : undefined}
          />
        ) : (
          renderPosts(postTree)
        )}
      </section>

      {!thread.isLocked && user && (
        <form ref={replyFormRef} onSubmit={handleReply} className="reply-form card card-pad">
          <div className="split-row">
            <h3>Напиши отговор</h3>
            {parentPostId && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setParentPostId(null)}>
                Откажи избрания отговор
              </button>
            )}
          </div>

          {parentPostId && <p className="replying-banner">Отговаряш на избрана публикация.</p>}

          <div className="form-grid reply-form-grid">
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Заглавие на публикацията"
            />
            <textarea
              className="textarea"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Допълнително описание (по желание)"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
            />
            {newPhotoPreview && <img src={newPhotoPreview} alt="Преглед" className="photo-preview" />}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Публикуване..." : "Публикувай отговор"}
          </button>
        </form>
      )}

      {activeImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal__toolbar" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => updateZoom((prev) => prev - 0.2)} aria-label="Намали">
              <Minus size={15} />
            </button>
            <span>{Math.round(imageZoom * 100)}%</span>
            <button type="button" onClick={() => updateZoom((prev) => prev + 0.2)} aria-label="Увеличи">
              <Plus size={15} />
            </button>
            <button type="button" onClick={() => updateZoom(1)} aria-label="Нулирай мащаба">
              <RotateCcw size={15} />
            </button>
            <button type="button" onClick={closeImageModal} aria-label="Затвори">
              <X size={15} />
            </button>
          </div>
          <div className="image-modal__canvas" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeImage.url}
              alt="Пълен размер"
              className="image-modal__img"
              style={{ transform: `scale(${imageZoom})` }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
