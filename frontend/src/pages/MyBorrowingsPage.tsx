import { useState, useEffect } from "react";
import { api, getAssetUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Booking } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { 
  Package, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  CheckCircle,
  Clock,
  Check
} from "lucide-react";

export function MyBorrowingsPage() {
  const { openChat, setCurrentTab } = useAuth();
  const [borrowings, setBorrowings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadBorrowings();
  }, []);

  async function loadBorrowings() {
    setLoading(true);
    try {
      const res = await api.getMyBorrowings();
      if (res.success) {
        setBorrowings(res.borrowings);
      }
    } catch (err) {
      console.error("Load borrowings error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenChat(b: Booking) {
    if (b.conversation_id) {
      openChat(b.conversation_id);
    } else {
      setActionLoading(b.id);
      try {
        const res = await api.startItemChat(b.listing_id);
        if (res.success && res.conversationId) {
          openChat(res.conversationId);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to open chat with owner.");
      } finally {
        setActionLoading(null);
      }
    }
  }

  async function handleConfirmPickup(bookingId: number) {
    setActionLoading(bookingId);
    try {
      const res = await api.confirmPickup(bookingId);
      alert(res.message);
      await loadBorrowings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm pickup.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmReturn(bookingId: number) {
    setActionLoading(bookingId);
    try {
      const res = await api.confirmReturn(bookingId);
      alert(res.message);
      await loadBorrowings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm return.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelRequest(bookingId: number) {
    if (!confirm("Are you sure you want to cancel this borrow request?")) return;
    setActionLoading(bookingId);
    try {
      await api.updateBookingStatus(bookingId, "cancelled");
      await loadBorrowings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
          My Borrowings
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Chat with owners to negotiate price and pickup spot. Both parties update handover and return in the app.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your borrowings...
        </div>
      ) : borrowings.length === 0 ? (
        <div
          className="bb-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-canvas)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <Package size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>No borrow requests yet</h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 380 }}>
            You haven't requested any items yet. Explore the campus marketplace to find gear and notes!
          </p>
          <button
            onClick={() => setCurrentTab("borrow")}
            className="bb-btn-coral"
            style={{ marginTop: 8 }}
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {borrowings.map((b) => {
            const borrowerConfirmedPickup = Boolean(b.borrower_confirmed_pickup);
            const lenderConfirmedPickup = Boolean(b.lender_confirmed_pickup);
            const borrowerConfirmedReturn = Boolean(b.borrower_confirmed_return);
            const lenderConfirmedReturn = Boolean(b.lender_confirmed_return);

            return (
              <div
                key={b.id}
                className="bb-card borrowing-card"
                style={{
                  padding: "20px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 18,
                  alignItems: "center"
                }}
              >
                <style>{`
                  @media (max-width: 680px) {
                    .borrowing-card {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>

                {/* Thumbnail */}
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface-soft)",
                    overflow: "hidden",
                    flexShrink: 0
                  }}
                >
                  {b.image_url ? (
                    <img
                      src={getAssetUrl(b.image_url)}
                      alt={b.item_title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                      <Package size={28} />
                    </div>
                  )}
                </div>

                {/* Information */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>
                      {b.item_title}
                    </h3>
                    <StatusBadge status={b.status} />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={14} />
                      <span>{new Date(b.start_date).toLocaleDateString()} – {new Date(b.end_date).toLocaleDateString()}</span>
                    </span>

                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={14} color="var(--accent-coral)" />
                      <span>{b.pickup_location}</span>
                    </span>

                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                      Total: ₹{b.total_price} {b.agreed_price ? `(Negotiated: ₹${b.agreed_price})` : ""}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    Owner: <strong>{b.owner_name}</strong> ({b.owner_email})
                  </p>

                  {/* Dual-Confirmation Handover Box (When Accepted) */}
                  {b.status === "accepted" && (
                    <div
                      style={{
                        background: "rgba(33, 150, 243, 0.08)",
                        border: "1px solid rgba(33, 150, 243, 0.25)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 12px",
                        fontSize: 12.5
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={15} />
                        <span>Handover Status (Both must confirm):</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                        <span style={{ color: borrowerConfirmedPickup ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                          {borrowerConfirmedPickup ? "✓ You received item" : "⏳ You haven't confirmed pickup"}
                        </span>
                        <span style={{ color: lenderConfirmedPickup ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                          {lenderConfirmedPickup ? "✓ Owner confirmed handover" : "⏳ Owner hasn't confirmed yet"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dual-Confirmation Return Box (When Active) */}
                  {b.status === "active" && (
                    <div
                      style={{
                        background: "rgba(255, 152, 0, 0.08)",
                        border: "1px solid rgba(255, 152, 0, 0.25)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 12px",
                        fontSize: 12.5
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={15} />
                        <span>Return Status (Both must confirm return):</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                        <span style={{ color: borrowerConfirmedReturn ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                          {borrowerConfirmedReturn ? "✓ You marked as returned" : "⏳ You haven't confirmed return"}
                        </span>
                        <span style={{ color: lenderConfirmedReturn ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                          {lenderConfirmedReturn ? "✓ Owner confirmed item received" : "⏳ Owner hasn't confirmed receipt"}
                        </span>
                      </div>
                    </div>
                  )}

                  {b.owner_response_notes && (
                    <p style={{ fontSize: 12.5, color: "var(--text-main)", background: "var(--bg-canvas)", padding: "6px 10px", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--primary)" }}>
                      <strong>Owner Note:</strong> {b.owner_response_notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", minWidth: 175 }}>
                  {/* Chat button */}
                  <button
                    onClick={() => handleOpenChat(b)}
                    className="bb-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    disabled={actionLoading === b.id}
                  >
                    <MessageSquare size={15} />
                    <span>Chat & Negotiate</span>
                  </button>

                  {/* Cancel action if pending */}
                  {b.status === "pending" && (
                    <button
                      onClick={() => handleCancelRequest(b.id)}
                      className="bb-btn-secondary"
                      style={{ padding: "6px 12px", fontSize: 12.5, color: "var(--accent-coral-text)" }}
                      disabled={actionLoading === b.id}
                    >
                      Cancel Request
                    </button>
                  )}

                  {/* Handover: Confirm Item Received when accepted */}
                  {b.status === "accepted" && !borrowerConfirmedPickup && (
                    <button
                      onClick={() => handleConfirmPickup(b.id)}
                      className="bb-btn-coral"
                      style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      disabled={actionLoading === b.id}
                    >
                      <Check size={16} />
                      <span>Confirm Item Received</span>
                    </button>
                  )}

                  {b.status === "accepted" && borrowerConfirmedPickup && !lenderConfirmedPickup && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px" }}>
                      Waiting for owner confirmation...
                    </span>
                  )}

                  {/* Return: Confirm Item Returned when active */}
                  {b.status === "active" && !borrowerConfirmedReturn && (
                    <button
                      onClick={() => handleConfirmReturn(b.id)}
                      className="bb-btn-yellow"
                      style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      disabled={actionLoading === b.id}
                    >
                      <CheckCircle size={15} />
                      <span>Confirm Item Returned</span>
                    </button>
                  )}

                  {b.status === "active" && borrowerConfirmedReturn && !lenderConfirmedReturn && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px" }}>
                      Waiting for owner to confirm receipt...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
