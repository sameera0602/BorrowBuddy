import { useAuth } from "../context/AuthContext";
import { ShieldCheck, LogOut } from "lucide-react";

export function Navbar() {
  const { user, currentTab, setCurrentTab, logout } = useAuth();

  if (!user) return null;

  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-sm)"
      }}
    >
      {/* Admin quick bar if admin */}
      {user.role === "admin" && (
        <div className="admin-banner">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={16} color="var(--accent-yellow)" />
            <span>Admin Mode (Roll No: SM 471)</span>
          </div>
          <button
            onClick={() => setCurrentTab("admin")}
            style={{
              background: currentTab === "admin" ? "var(--accent-yellow)" : "rgba(255,255,255,0.15)",
              color: currentTab === "admin" ? "#1F2937" : "#FFFFFF",
              fontWeight: 700,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)"
            }}
          >
            Open Admin Portal
          </button>
        </div>
      )}

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        {/* Brand & Campus Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setCurrentTab("home")}
            style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "var(--primary)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                boxShadow: "0 2px 8px rgba(19, 34, 56, 0.2)"
              }}
            >
              BB
            </div>
            <div>
              <span style={{ fontSize: 19, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
                BorrowBuddy
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: -2 }}>
                <span className="campus-pill" style={{ padding: "1px 6px", fontSize: 10.5 }}>
                  SRMIST Trichy
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: 4
          }}
          className="desktop-nav"
        >
          <style>{`
            @media (min-width: 900px) {
              .desktop-nav { display: flex !important; }
            }
          `}</style>
          <button
            onClick={() => setCurrentTab("home")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "home" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "home" ? "var(--primary-light)" : "transparent"
            }}
          >
            Home
          </button>

          <button
            onClick={() => setCurrentTab("borrow")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "borrow" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "borrow" ? "var(--primary-light)" : "transparent"
            }}
          >
            Borrow
          </button>

          <button
            onClick={() => setCurrentTab("share")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "share" ? "var(--accent-coral)" : "var(--text-muted)",
              background: currentTab === "share" ? "var(--accent-coral-light)" : "transparent"
            }}
          >
            + Share
          </button>

          <button
            onClick={() => setCurrentTab("borrowings")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "borrowings" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "borrowings" ? "var(--primary-light)" : "transparent"
            }}
          >
            My Borrowings
          </button>

          <button
            onClick={() => setCurrentTab("lending")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "lending" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "lending" ? "var(--primary-light)" : "transparent"
            }}
          >
            My Lending
          </button>

          <button
            onClick={() => setCurrentTab("help")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "help" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "help" ? "var(--primary-light)" : "transparent"
            }}
          >
            Help a Buddy
          </button>

          <button
            onClick={() => setCurrentTab("chats")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "chats" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "chats" ? "var(--primary-light)" : "transparent"
            }}
          >
            My Chats
          </button>

          <button
            onClick={() => setCurrentTab("my-help")}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13.5,
              fontWeight: 600,
              color: currentTab === "my-help" ? "var(--primary)" : "var(--text-muted)",
              background: currentTab === "my-help" ? "var(--primary-light)" : "transparent"
            }}
          >
            My Help Requests
          </button>
        </nav>

        {/* User profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setCurrentTab("profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: currentTab === "profile" ? "var(--primary-light)" : "var(--bg-canvas)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)"
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign: "left", display: "none" }} className="user-name-text">
              <style>{`@media (min-width: 640px) { .user-name-text { display: block !important; } }`}</style>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", maxWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.fullName || "Student"}
              </div>
            </div>
          </button>

          <button
            onClick={logout}
            style={{
              padding: "8px",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Log Out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
