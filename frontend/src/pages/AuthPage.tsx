import React, { useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Crown, 
  Lock, 
  User as UserIcon, 
  Mail, 
  KeyRound 
} from "lucide-react";

type Screen = "identify" | "login" | "signup" | "otp" | "password";

export function AuthPage() {
  const { setUser, setCurrentTab } = useAuth();

  // Screen & Input States
  const [screen, setScreen] = useState<Screen>("identify");
  const [identifier, setIdentifier] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupToken, setSignupToken] = useState("");

  // Feedback States
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Quick reset helper
  function resetToIdentify() {
    setMessage("");
    setIsError(false);
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setSignupToken("");
    setScreen("identify");
  }

  // Handle direct Admin 1-Click Access
  async function handleAdminQuickLogin() {
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const res = await api.adminQuickLogin();
      if (res.success && res.user) {
        setUser(res.user);
        setCurrentTab("admin"); // DIRECT TO ADMIN PORTAL!
      } else {
        throw new Error(res.message || "Could not grant admin access.");
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  // 1. STEP ONE: IDENTIFY ID / EMAIL
  async function handleIdentifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setIsError(true);
      setMessage("Please enter your SRM Student ID or college email.");
      setLoading(false);
      return;
    }

    // Check for sm4721 admin roll number directly
    const norm = cleanInput.toLowerCase().replace(/\s+/g, "");
    if (norm === "sm4721" || norm === "sm471" || norm === "sm4721@srmist.edu.in") {
      await handleAdminQuickLogin();
      return;
    }

    try {
      const checkRes = await api.checkUser(cleanInput);

      if (checkRes.isAdmin) {
        // If identified as admin, log directly into admin portal
        await handleAdminQuickLogin();
        return;
      }

      setResolvedEmail(checkRes.email);

      if (checkRes.exists) {
        // Existing user -> Go directly to password login!
        setFullName(checkRes.fullName || "Student");
        setScreen("login");
        setMessage(`Welcome back, ${checkRes.fullName || "Student"}! Please enter your password.`);
      } else {
        // New user -> Go to signup (Full name + OTP flow)
        setFullName("");
        setScreen("signup");
        setMessage(`New student detected! Please enter your Full Name to receive an OTP on ${checkRes.email}.`);
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Could not verify ID. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 2. STEP TWO: SIGNUP -> REQUEST OTP
  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const cleanName = fullName.trim();
      if (cleanName.length < 2) {
        throw new Error("Please enter your full name.");
      }

      await api.register(cleanName, resolvedEmail);
      setScreen("otp");
      setMessage(`Verification OTP sent! Please check your inbox at ${resolvedEmail}.`);
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  // 3. STEP THREE: VERIFY OTP
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const result = await api.verifyOtp(resolvedEmail, otp.trim());
      setSignupToken(result.signupToken);
      setScreen("password");
      setMessage("Email verified! Now create a secure password.");
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  // 4. STEP FOUR: SET PASSWORD
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      if (password.length < 8 || password.length > 72) {
        throw new Error("Password must contain between 8 and 72 characters.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await api.setPassword(signupToken, password);

      // Auto login right away
      const loginRes = await api.login(resolvedEmail, password);
      if (loginRes.success && loginRes.user) {
        setUser(loginRes.user);
        setCurrentTab("home");
      } else {
        setScreen("login");
        setMessage("Account created! Please enter your password to log in.");
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  // 5. STEP FIVE: PASSWORD LOGIN
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const res = await api.login(resolvedEmail, password);
      if (res.success && res.user) {
        setUser(res.user);
        if (res.user.role === "admin") {
          setCurrentTab("admin"); // Admin gets admin portal
        } else {
          setCurrentTab("home");  // Students get marketplace
        }
      } else {
        const meRes = await api.getMe();
        if (meRes.success && meRes.user) {
          setUser(meRes.user);
          if (meRes.user.role === "admin") setCurrentTab("admin");
          else setCurrentTab("home");
        }
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Invalid password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "var(--bg-canvas)"
      }}
    >
      <div
        className="bb-card"
        style={{
          width: "100%",
          maxWidth: 460,
          padding: "38px 30px",
          position: "relative"
        }}
      >
        {/* Campus Header & Brand Mark */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "15px",
              background: "var(--ink)",
              color: "#A7F3D0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              margin: "0 auto 12px",
              boxShadow: "0 8px 24px rgba(23, 32, 51, 0.16)",
              fontFamily: "var(--font-display)"
            }}
          >
            BB
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
            BorrowBuddy
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>
            SRMIST Tiruchirappalli Campus Marketplace
          </p>
          <div style={{ marginTop: 10 }}>
            <span className="campus-pill">
              CAMPUS EXCLUSIVE • @srmist.edu.in
            </span>
          </div>
        </div>

        {/* Feedback Banner */}
        {message && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: isError ? "var(--accent-coral-light)" : "var(--accent-green-light)",
              color: isError ? "var(--accent-coral-text)" : "var(--accent-green-text)",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: 20
            }}
          >
            {isError ? (
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            ) : (
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. SCREEN: IDENTIFY (Unified Single Entry)                      */}
        {/* ============================================================== */}
        {screen === "identify" && (
          <div>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
                Sign In to Campus Circle
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>
                Enter your student roll number or SRM college email to continue.
              </p>
            </div>

            <form onSubmit={handleIdentifySubmit}>
              <div className="form-group">
                <label>Student ID or College Email</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. sm4721 or rollno@srmist.edu.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    style={{ paddingLeft: 42 }}
                  />
                  <UserIcon
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-subtle)"
                    }}
                  />
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                  Enter your roll number (e.g. <strong>sm4721</strong>) or your full official @srmist.edu.in email.
                </p>
              </div>

              <button
                type="submit"
                className="bb-btn-primary"
                style={{ width: "100%", marginTop: 6 }}
                disabled={loading}
              >
                {loading ? "Checking ID..." : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Admin Access Button */}
            <div
              style={{
                marginTop: 22,
                padding: "14px",
                borderRadius: "var(--radius-lg)",
                background: "linear-gradient(135deg, rgba(109, 74, 255, 0.08) 0%, rgba(53, 200, 138, 0.08) 100%)",
                border: "1px dashed rgba(109, 74, 255, 0.3)",
                textAlign: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--primary)" }}>
                <Crown size={15} />
                <span>Authorized Admin Identity</span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "4px 0 10px" }}>
                Roll No: <strong>SM 471</strong> (sm4721@srmist.edu.in)
              </p>
              <button
                type="button"
                onClick={handleAdminQuickLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--ink)",
                  color: "#FFFFFF",
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(23, 32, 51, 0.15)"
                }}
              >
                <Sparkles size={14} color="#A7F3D0" />
                <span>One-Click Admin Login (sm4721)</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. SCREEN: LOGIN (Existing User with Password)                 */}
        {/* ============================================================== */}
        {screen === "login" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary-light)", color: "var(--primary)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                <CheckCircle2 size={13} />
                <span>Verified Account Found</span>
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-main)" }}>
                Welcome back, {fullName}! 👋
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Sign in with your password for <strong>{resolvedEmail}</strong>
              </p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Account Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    style={{ paddingLeft: 42 }}
                  />
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50)",
                      color: "var(--text-subtle)"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bb-btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Log In to BorrowBuddy"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={resetToIdentify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} />
                <span>Use a different Student ID</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. SCREEN: SIGNUP (New User -> Enter Full Name)                 */}
        {/* ============================================================== */}
        {screen === "signup" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent-green-light)", color: "var(--accent-green-text)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                <Sparkles size={13} />
                <span>New Student Registration</span>
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-main)" }}>
                What's your name? 🎓
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Registering with <strong>{resolvedEmail}</strong>. We will send an OTP to verify your email.
              </p>
            </div>

            <form onSubmit={handleSignupSubmit}>
              <div className="form-group">
                <label>Your Full Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Siddharth R."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoFocus
                    maxLength={100}
                    style={{ paddingLeft: 42 }}
                  />
                  <UserIcon
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50)",
                      color: "var(--text-subtle)"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bb-btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={loading}
              >
                {loading ? "Sending verification code..." : "Send Verification OTP →"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={resetToIdentify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} />
                <span>Change Student ID</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SCREEN: OTP (Verify 6-Digit Email Code)                      */}
        {/* ============================================================== */}
        {screen === "otp" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary-light)", color: "var(--primary)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                <Mail size={13} />
                <span>Check Your SRM Inbox</span>
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-main)" }}>
                Enter Verification Code
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                We sent a 6-digit code to <strong>{resolvedEmail}</strong>.
              </p>
            </div>

            <form onSubmit={handleOtpSubmit}>
              <div className="form-group">
                <label>6-Digit OTP Code</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    style={{
                      fontSize: 22,
                      letterSpacing: "0.25em",
                      textAlign: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, textAlign: "center" }}>
                  Code expires in 5 minutes.
                </p>
              </div>

              <button
                type="submit"
                className="bb-btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Code & Continue →"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={resetToIdentify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} />
                <span>Start Over</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. SCREEN: PASSWORD (Set Secure Password)                      */}
        {/* ============================================================== */}
        {screen === "password" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent-green-light)", color: "var(--accent-green-text)", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                <KeyRound size={13} />
                <span>Final Step</span>
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-main)" }}>
                Create Password
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Choose a password for your new BorrowBuddy account.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>New Password (8+ characters)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                    autoFocus
                    style={{ paddingLeft: 42 }}
                  />
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50)",
                      color: "var(--text-subtle)"
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                    style={{ paddingLeft: 42 }}
                  />
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50)",
                      color: "var(--text-subtle)"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bb-btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={loading}
              >
                {loading ? "Creating account..." : "Complete & Enter BorrowBuddy →"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={resetToIdentify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} />
                <span>Start Over</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
