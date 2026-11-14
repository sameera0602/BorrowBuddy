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
  CheckCircle 
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

  async function handleStatusUpdate(bookingId: number, newStatus: string) {
    setActionLoading(bookingId);
    try {
      await api.updateBookingStatus(bookingId, newStatus);
      await loadBorrowings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update booking.");
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
          Track your item rental requests, active reservations, and chat with lenders.
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
          {borrowings.map((b) => (
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    Total: ₹{b.total_price}
                  </span>
                </div>

                <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  Owner: <strong>{b.owner_name}</strong> ({b.owner_email})
                </p>

                {b.owner_response_notes && (
                  <p style={{ fontSize: 12.5, color: "var(--text-main)", background: "var(--bg-canvas)", padding: "6px 10px", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--primary)" }}>
                    <strong>Owner Note:</strong> {b.owner_response_notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", minWidth: 160 }}>
                {/* Chat button if conversation exists */}
                {b.conversation_id && (
                  <button
                    onClick={() => openChat(b.conversation_id!)}
                    className="bb-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                  >
                    <MessageSquare size={15} />
                    <span>Chat with Owner</span>
                  </button>
                )}

                {/* Cancel action if pending */}
                {b.status === "pending" && (
                  <button
                    onClick={() => handleStatusUpdate(b.id, "cancelled")}
                    className="bb-btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12.5, color: "var(--accent-coral-text)" }}
                    disabled={actionLoading === b.id}
                  >
                    Cancel Request
                  </button>
                )}

                {/* Mark as returned if active */}
                {b.status === "active" && (
                  <button
                    onClick={() => handleStatusUpdate(b.id, "completed")}
                    className="bb-btn-yellow"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    disabled={actionLoading === b.id}
                  >
                    <CheckCircle size={15} />
                    <span>Mark as Returned</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
