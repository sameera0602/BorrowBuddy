import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { 
  ShieldCheck, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar, 
  Edit3, 
  LogOut,
  Smartphone
} from "lucide-react";

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();

  const [stats, setStats] = useState<any>({
    listingsCount: 0,
    borrowingsCount: 0,
    lendingsCount: 0,
    helpCount: 0
  });

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("3rd Year");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsPWA(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.getProfile();
      if (res.success) {
        setStats(res.stats);
        setPhone(res.profile.phone || "");
        setDepartment(res.profile.department || "Computer Science and Engineering");
        setYearOfStudy(res.profile.yearOfStudy || "3rd Year");
        setBio(res.profile.bio || "");
      }
    } catch (err) {
      console.error("Profile load error:", err);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await api.updateProfile({
        phone,
        department,
        yearOfStudy,
        bio
      });
      setMessage("Profile details updated successfully!");
      setEditing(false);
      await refreshUser();
      await loadProfile();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
          Student Profile
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Your verified SRMIST Tiruchirappalli campus account and sharing stats.
        </p>
      </div>

      {message && (
        <div style={{ padding: "10px 14px", background: "var(--accent-green-light)", color: "var(--accent-green-text)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Profile Card */}
      <div className="bb-card" style={{ padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                boxShadow: "var(--shadow-card)"
              }}
            >
              {(user?.fullName || user?.email || "S").charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>
                  {user?.fullName || "Student"}
                </h2>
                {user?.role === "admin" && (
                  <span className="campus-pill" style={{ background: "var(--primary)", color: "var(--accent-yellow)", borderColor: "var(--primary)" }}>
                    Admin (SM 471)
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>
                <Mail size={14} />
                <span>{user?.email}</span>
                <span className="campus-pill" style={{ padding: "2px 6px", fontSize: 10.5 }}>
                  <ShieldCheck size={11} />
                  Verified SRMIST
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="bb-btn-secondary"
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            <Edit3 size={15} />
            <span>{editing ? "Cancel Editing" : "Edit Profile"}</span>
          </button>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid var(--border-color)"
          }}
        >
          <div style={{ background: "var(--bg-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", display: "block" }}>
              {stats.listingsCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Items Listed</span>
          </div>

          <div style={{ background: "var(--bg-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-coral)", display: "block" }}>
              {stats.borrowingsCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Items Borrowed</span>
          </div>

          <div style={{ background: "var(--bg-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-yellow-text)", display: "block" }}>
              {stats.lendingsCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Rentals Completed</span>
          </div>

          <div style={{ background: "var(--bg-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", display: "block" }}>
              {stats.helpCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Help Requests</span>
          </div>
        </div>
      </div>

      {/* Edit or Details View */}
      <div className="bb-card" style={{ padding: "28px" }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>
          Campus Details
        </h3>

        {editing ? (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-group">
                <label>Department / Branch</label>
                <input
                  type="text"
                  className="form-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science and Engineering"
                />
              </div>

              <div className="form-group">
                <label>Year of Study</label>
                <select
                  className="form-select"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Contact Phone (Optional, for pickup coordination)</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div className="form-group">
              <label>Student Bio / Note</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your interests, hostel block, or typical availability on campus..."
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button
                type="button"
                className="bb-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bb-btn-primary"
                style={{ flex: 2 }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <GraduationCap size={18} color="var(--primary)" />
              <span style={{ color: "var(--text-muted)" }}>Department:</span>
              <strong style={{ color: "var(--text-main)" }}>{department || "Not specified"}</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <Calendar size={18} color="var(--primary)" />
              <span style={{ color: "var(--text-muted)" }}>Year:</span>
              <strong style={{ color: "var(--text-main)" }}>{yearOfStudy || "Not specified"}</strong>
            </div>

            {phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Phone size={18} color="var(--primary)" />
                <span style={{ color: "var(--text-muted)" }}>Phone:</span>
                <strong style={{ color: "var(--text-main)" }}>{phone}</strong>
              </div>
            )}

            {bio && (
              <div style={{ marginTop: 8, padding: "12px", background: "var(--bg-canvas)", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>About Me</span>
                <p style={{ fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.5 }}>{bio}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PWA App Status Card */}
      <div className="bb-card" style={{ marginBottom: 24, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: isPWA ? "rgba(16, 185, 129, 0.15)" : "var(--primary)",
              color: isPWA ? "var(--success)" : "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Smartphone size={22} color={isPWA ? "var(--success)" : "var(--accent-yellow)"} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>
              {isPWA ? "BorrowBuddy App Installed" : "Progressive Web App (PWA)"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {isPWA ? "Running in native standalone app mode" : "Install on your home screen for rapid access & offline mode"}
            </div>
          </div>
        </div>

        {isPWA ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "var(--radius-full)" }}>
            Active
          </span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "rgba(19, 34, 56, 0.08)", padding: "4px 10px", borderRadius: "var(--radius-full)" }}>
            Install Ready
          </span>
        )}
      </div>

      {/* Logout button */}
      <div style={{ textAlign: "center", paddingBottom: 24 }}>
        <button
          onClick={logout}
          className="bb-btn-secondary"
          style={{ color: "var(--accent-coral-text)", borderColor: "var(--accent-coral-light)" }}
        >
          <LogOut size={16} />
          <span>Log Out from BorrowBuddy</span>
        </button>
      </div>
    </div>
  );
}
