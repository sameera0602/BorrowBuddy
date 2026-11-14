import { useState, useEffect } from "react";
import { Download, Share2, X, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 74,
          left: 16,
          right: 16,
          maxWidth: 480,
          margin: "0 auto",
          zIndex: 999,
          background: "var(--bg-surface)",
          border: "2px solid var(--primary)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          boxShadow: "0 10px 25px -5px rgba(19, 34, 56, 0.2), 0 8px 10px -6px rgba(19, 34, 56, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          animation: "slideUp 0.3s ease-out"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "var(--primary)",
              color: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(19, 34, 56, 0.25)"
            }}
          >
            <Smartphone size={22} color="var(--accent-yellow)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", lineHeight: 1.2 }}>
              Install BorrowBuddy
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Quick access on your home screen
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={handleInstallClick}
            style={{
              background: "var(--primary)",
              color: "#FFFFFF",
              border: "none",
              padding: "7px 14px",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer"
            }}
          >
            <Download size={14} />
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss install prompt"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              padding: 6,
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(19, 34, 56, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-xl)",
              padding: 24,
              maxWidth: 400,
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-main)" }}>
                Install on iPhone / iPad
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--text-main)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>1. Tap the <strong>Share</strong> icon in Safari</span>
                <Share2 size={18} color="var(--primary)" />
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>2. Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>3. Tap <strong>Add</strong> at the top right</span>
                <Check size={18} color="var(--success)" />
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                width: "100%",
                marginTop: 20,
                background: "var(--primary)",
                color: "#FFFFFF",
                border: "none",
                padding: "10px",
                borderRadius: "var(--radius-md)",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
