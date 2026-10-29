import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { BottomNav } from "./components/BottomNav";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { BorrowPage } from "./pages/BorrowPage";
import { SharePage } from "./pages/SharePage";
import { MyBorrowingsPage } from "./pages/MyBorrowingsPage";
import { MyLendingPage } from "./pages/MyLendingPage";
import { HelpBuddyPage } from "./pages/HelpBuddyPage";
import { MyHelpRequestsPage } from "./pages/MyHelpRequestsPage";
import { ChatsPage } from "./pages/ChatsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";

function AppContent() {
  const { user, loading, currentTab } = useAuth();

  // Initial session checking
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-canvas)",
          gap: 16
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "var(--radius-lg)",
            background: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 800,
            boxShadow: "var(--shadow-card)",
            animation: "pulse 1.5s infinite"
          }}
        >
          BB
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
          Loading BorrowBuddy...
        </p>
      </div>
    );
  }

  // Unauthenticated user -> Auth screen (Signup, OTP, Password, Login)
  if (!user) {
    return <AuthPage />;
  }

  // Authenticated user -> Full application dashboard
  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {currentTab === "home" && <HomePage />}
        {currentTab === "borrow" && <BorrowPage />}
        {currentTab === "share" && <SharePage />}
        {currentTab === "borrowings" && <MyBorrowingsPage />}
        {currentTab === "lending" && <MyLendingPage />}
        {currentTab === "help" && <HelpBuddyPage />}
        {currentTab === "my-help" && <MyHelpRequestsPage />}
        {currentTab === "chats" && <ChatsPage />}
        {currentTab === "profile" && <ProfilePage />}
        {currentTab === "admin" && <AdminPage />}
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
