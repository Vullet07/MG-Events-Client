import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Flag,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Newspaper,
  PlusSquare,
  Search,
  ShieldCheck,
  UserCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toBgRole } from "../utils/localize";
import "./AppShell.css";

const allNavItems = [
  {
    to: "/dashboard",
    label: "Табло",
    description: "Общ преглед",
    icon: LayoutDashboard
  },
  {
    to: "/threads",
    label: "Теми",
    description: "Форумни дискусии",
    icon: MessageSquare
  },
  {
    to: "/create-thread",
    label: "Нова тема",
    description: "Стартирай дискусия",
    icon: PlusSquare
  },
  {
    to: "/map",
    label: "Карта",
    description: "Пинове и сигнали",
    icon: MapPinned
  },
  {
    to: "/news",
    label: "Новини",
    description: "Съобщения",
    icon: Newspaper
  },
  {
    to: "/my-reports",
    label: "Моите сигнали",
    description: "Подадени доклади",
    icon: Flag
  },
  {
    to: "/profile",
    label: "Профил",
    description: "Настройки на акаунта",
    icon: UserCircle2
  },
  {
    to: "/admin/users",
    label: "Модерация",
    description: "Инструменти за админ/учител",
    icon: ShieldCheck,
    roles: ["Admin", "Teacher"]
  }
];

function getPageMeta(pathname) {
  if (pathname.startsWith("/threads/")) {
    return {
      title: "Детайли за тема",
      subtitle: "Отговори, снимки и вложени дискусии."
    };
  }

  if (pathname === "/dashboard") {
    return {
      title: "Основно табло",
      subtitle: "Състояние на общността, активност и бързи действия."
    };
  }

  const byPath = {
    "/threads": {
      title: "Форумни теми",
      subtitle: "Открий дискусии и създай нови теми."
    },
    "/create-thread": {
      title: "Създай тема",
      subtitle: "Започни целенасочена дискусия във форума."
    },
    "/map": {
      title: "Карта на събитията",
      subtitle: "Поставяй пинове и следи локални проблеми в МГ \"Академик Кирил Попов\"."
    },
    "/news": {
      title: "Новини",
      subtitle: "Официални съобщения и предстоящи събития."
    },
    "/my-reports": {
      title: "Моите сигнали",
      subtitle: "Следи сигналите, които си подал."
    },
    "/profile": {
      title: "Моят профил",
      subtitle: "Управлявай акаунта и активността си."
    },
    "/admin/users": {
      title: "Табло за модерация",
      subtitle: "Управлявай потребители, сигнали и учителски заявки."
    }
  };

  return (
    byPath[pathname] || {
      title: "MG Events",
      subtitle: "Платформа за училищна координация в МГ \"Академик Кирил Попов\" - Пловдив."
    }
  );
}

function persistLastVisited(pathname) {
  const matched = [...allNavItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname.startsWith(item.to));

  if (!matched) return;

  const payload = {
    to: matched.to,
    label: matched.label,
    at: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem("mg:lastVisited");
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(parsed) ? parsed : [];
    const next = [payload, ...normalized.filter((item) => item.to !== payload.to)].slice(0, 6);
    localStorage.setItem("mg:lastVisited", JSON.stringify(next));
  } catch {
    localStorage.setItem("mg:lastVisited", JSON.stringify([payload]));
  }
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickInput, setQuickInput] = useState("");

  const navItems = useMemo(
    () =>
      allNavItems.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(user?.role);
      }),
    [user?.role]
  );

  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);

  const filteredQuickMatches = useMemo(() => {
    const query = quickInput.trim().toLowerCase();
    if (!query) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [quickInput, navItems]);

  useEffect(() => {
    setSidebarOpen(false);
    persistLastVisited(location.pathname);
  }, [location.pathname]);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    const normalized = quickInput.trim().toLowerCase();
    if (!normalized) return;

    const exact = navItems.find((item) => item.label.toLowerCase() === normalized);
    if (exact) {
      navigate(exact.to);
      setQuickInput("");
      return;
    }

    const startsWith = navItems.find((item) => item.label.toLowerCase().startsWith(normalized));
    if (startsWith) {
      navigate(startsWith.to);
      setQuickInput("");
      return;
    }

    navigate(`/threads?search=${encodeURIComponent(quickInput.trim())}`);
    setQuickInput("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userInitial = (user?.username || "П").charAt(0).toUpperCase();

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
      <aside className="app-sidebar">
        <div className="brand-block">
          <div className="brand-logo-shell">
            <img className="brand-logo" src="/mg-events-mark.png" alt="MG Events" />
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `side-nav__link ${isActive ? "active" : ""}`}
              >
                <span className="side-nav__main">
                  <Icon size={15} />
                  <span>{item.label}</span>
                </span>
                <small>{item.description}</small>
              </NavLink>
            );
          })}
        </nav>

        <div className="side-user">
          <div className="side-user__identity">
            <div className="side-user__avatar">{userInitial}</div>
            <div className="side-user__copy">
              <p className="side-user__name">{user?.username || "Потребител"}</p>
              <p className="side-user__role">{toBgRole(user?.role)}</p>
            </div>
          </div>
          <button type="button" className="btn btn-danger btn-sm side-user__logout" onClick={handleLogout}>
            <LogOut size={14} />
            Изход
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <Menu size={16} />
            Меню
          </button>

          <div className="topbar-copy">
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.subtitle}</p>
          </div>

          <form className="quick-jump" onSubmit={handleQuickSubmit}>
            <input
              className="input"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Бърз достъп или търсене в темите"
            />
            <button className="btn btn-primary btn-sm" type="submit">
              <Search size={14} />
              Отвори
            </button>
            {quickInput && filteredQuickMatches.length > 0 && (
              <div className="quick-jump__matches">
                {filteredQuickMatches.slice(0, 4).map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    className="quick-jump__item"
                    onClick={() => {
                      navigate(item.to);
                      setQuickInput("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </form>
        </header>

        <main className="app-content reveal">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
