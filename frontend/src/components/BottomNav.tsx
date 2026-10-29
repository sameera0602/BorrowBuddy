import { useAuth } from "../context/AuthContext";
import { Compass, Package, PlusCircle, HelpCircle, MessageSquare, User } from "lucide-react";

export function BottomNav() {
  const { user, currentTab, setCurrentTab } = useAuth();

  if (!user) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
        zIndex: 100,
        boxShadow: "0 -4px 16px rgba(19, 34, 56, 0.05)"
      }}
      className="mobile-bottom-nav"
    >
      <style>{`
        @media (min-width: 900px) {
          .mobile-bottom-nav { display: none !important; }
        }
      `}</style>

      <button
        onClick={() => setCurrentTab("home")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: currentTab === "home" ? "var(--primary)" : "var(--text-muted)",
          flex: 1
        }}
      >
        <Compass size={20} strokeWidth={currentTab === "home" ? 2.5 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: currentTab === "home" ? 700 : 500 }}>Home</span>
      </button>

      <button
        onClick={() => setCurrentTab("borrow")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: currentTab === "borrow" ? "var(--primary)" : "var(--text-muted)",
          flex: 1
        }}
      >
        <Package size={20} strokeWidth={currentTab === "borrow" ? 2.5 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: currentTab === "borrow" ? 700 : 500 }}>Borrow</span>
      </button>

      {/* Prominent Share Button */}
      <button
        onClick={() => setCurrentTab("share")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: "var(--accent-coral)",
          flex: 1
        }}
      >
        <div
          style={{
            background: "var(--accent-coral)",
            color: "#fff",
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: -16,
            boxShadow: "0 4px 12px rgba(244, 63, 94, 0.35)"
          }}
        >
          <PlusCircle size={22} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Share</span>
      </button>

      <button
        onClick={() => setCurrentTab("help")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: currentTab === "help" ? "var(--primary)" : "var(--text-muted)",
          flex: 1
        }}
      >
        <HelpCircle size={20} strokeWidth={currentTab === "help" ? 2.5 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: currentTab === "help" ? 700 : 500 }}>Help</span>
      </button>

      <button
        onClick={() => setCurrentTab("chats")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: currentTab === "chats" ? "var(--primary)" : "var(--text-muted)",
          flex: 1
        }}
      >
        <MessageSquare size={20} strokeWidth={currentTab === "chats" ? 2.5 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: currentTab === "chats" ? 700 : 500 }}>Chats</span>
      </button>

      <button
        onClick={() => setCurrentTab("profile")}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: currentTab === "profile" ? "var(--primary)" : "var(--text-muted)",
          flex: 1
        }}
      >
        <User size={20} strokeWidth={currentTab === "profile" ? 2.5 : 1.8} />
        <span style={{ fontSize: 11, fontWeight: currentTab === "profile" ? 700 : 500 }}>Profile</span>
      </button>
    </nav>
  );
}
