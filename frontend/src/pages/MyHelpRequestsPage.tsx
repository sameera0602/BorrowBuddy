import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { HelpRequest } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { 
  MessageSquare, 
  Check, 
  X, 
  PlusCircle 
} from "lucide-react";

export function MyHelpRequestsPage() {
  const { openChat, setCurrentTab } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadMyHelp();
  }, []);

  async function loadMyHelp() {
    setLoading(true);
    try {
      const res = await api.getMyHelpRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error("Load my help requests error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptOffer(offerId: number) {
    setActionLoading(offerId);
    try {
      const res = await api.updateHelpOfferStatus(offerId, "accepted");
      await loadMyHelp();
      if (res.conversationId) {
        openChat(res.conversationId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to accept offer.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeclineOffer(offerId: number) {
    setActionLoading(offerId);
    try {
      await api.updateHelpOfferStatus(offerId, "declined");
      await loadMyHelp();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to decline offer.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            My Help Requests
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Review peer offers, choose a helper, and collaborate via private chat.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab("help")}
          className="bb-btn-coral"
        >
          <PlusCircle size={17} />
          <span>Post New Request</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your help requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>You haven't posted any help requests yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Need notes alignment, proofreading, or a study partner? Post a request!</p>
          <button onClick={() => setCurrentTab("help")} className="bb-btn-coral" style={{ marginTop: 14 }}>
            Post a Request
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {requests.map((r) => (
            <div key={r.id} className="bb-card" style={{ padding: "24px" }}>
              {/* Header info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="bb-badge bb-badge-open">{r.category}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--primary)" }}>{r.title}</h3>
                </div>

                {r.conversation_id && (
                  <button
                    onClick={() => openChat(r.conversation_id!)}
                    className="bb-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                  >
                    <MessageSquare size={15} />
                    <span>Open Help Chat</span>
                  </button>
                )}
              </div>

              <p style={{ fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.6, marginBottom: 16 }}>
                {r.description}
              </p>

              {/* Incoming Offers Section */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--primary)", marginBottom: 10 }}>
                  Offers from Students ({r.offers?.length || 0})
                </h4>

                {!r.offers || r.offers.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No offers received yet. Other students will see your request on the Help a Buddy board.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {r.offers.map((offer) => (
                      <div
                        key={offer.id}
                        style={{
                          background: "var(--bg-canvas)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          padding: "14px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                              {offer.helper_name}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              ({offer.helper_email})
                            </span>
                            <StatusBadge status={offer.status} />
                          </div>

                          <p style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.5, marginBottom: 6 }}>
                            "{offer.message}"
                          </p>

                          {offer.price_quote && Number(offer.price_quote) > 0 ? (
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-coral)" }}>
                              Proposed Quote: ₹{offer.price_quote}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-green-text)" }}>
                              Free Peer Assistance
                            </span>
                          )}
                        </div>

                        {offer.status === "pending" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleAcceptOffer(offer.id)}
                              className="bb-btn-primary"
                              style={{ padding: "7px 14px", fontSize: 12.5 }}
                              disabled={actionLoading === offer.id}
                            >
                              <Check size={14} />
                              <span>Accept & Chat</span>
                            </button>

                            <button
                              onClick={() => handleDeclineOffer(offer.id)}
                              className="bb-btn-secondary"
                              style={{ padding: "7px 12px", fontSize: 12.5, color: "var(--accent-coral-text)" }}
                              disabled={actionLoading === offer.id}
                            >
                              <X size={14} />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
