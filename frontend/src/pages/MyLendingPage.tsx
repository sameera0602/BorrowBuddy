import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Booking, Listing } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { 
  Package, 
  Calendar, 
  MessageSquare, 
  Check, 
  X, 
  Trash2, 
  PlusCircle 
} from "lucide-react";

export function MyLendingPage() {
  const { openChat, setCurrentTab } = useAuth();

  const [activeTab, setActiveTab] = useState<"requests" | "listings">("requests");
  const [incomingRequests, setIncomingRequests] = useState<Booking[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadLendingData();
  }, []);

  async function loadLendingData() {
    setLoading(true);
    try {
      const res = await api.getMyLending();
      if (res.success) {
        setIncomingRequests(res.incomingRequests);
        setMyListings(res.myListings);
      }
    } catch (err) {
      console.error("Fetch lending error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookingAction(bookingId: number, newStatus: "accepted" | "declined" | "completed") {
    setActionLoading(bookingId);
    try {
      const res = await api.updateBookingStatus(bookingId, newStatus);
      await loadLendingData();
      if (newStatus === "accepted" && res.conversationId) {
        openChat(res.conversationId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update booking.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteListing(listingId: number) {
    if (!confirm("Are you sure you want to withdraw this listing?")) return;
    try {
      await api.deleteListing(listingId);
      await loadLendingData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete listing.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            My Lending
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Manage your item listings, approve borrower requests, and coordinate returns.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab("share")}
          className="bb-btn-coral"
        >
          <PlusCircle size={18} />
          <span>+ Add New Listing</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-color)", paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "requests" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "requests" ? "var(--primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>Incoming Requests & Rentals</span>
          {incomingRequests.filter((r) => r.status === "pending").length > 0 && (
            <span style={{ background: "var(--accent-coral)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
              {incomingRequests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("listings")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "listings" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "listings" ? "var(--primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>My Listings ({myListings.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading lending dashboard...
        </div>
      ) : activeTab === "requests" ? (
        /* INCOMING REQUESTS TAB */
        incomingRequests.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>No incoming rental requests yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>When students request to borrow your items, they will appear here for your approval.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="bb-card"
                style={{
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>
                      {req.item_title}
                    </h3>
                    <StatusBadge status={req.status} />
                  </div>

                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Borrower: <strong>{req.borrower_name}</strong> ({req.borrower_email})
                  </p>

                  <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--text-main)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={14} color="var(--primary)" />
                      <span>{new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}</span>
                    </span>

                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                      Total Earned: ₹{req.total_price}
                    </span>
                  </div>

                  {req.borrower_notes && (
                    <div style={{ background: "var(--bg-canvas)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 12.5, marginTop: 4 }}>
                      <strong>Borrower message:</strong> {req.borrower_notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", alignSelf: "center" }}>
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleBookingAction(req.id, "accepted")}
                        className="bb-btn-primary"
                        style={{ padding: "8px 16px", fontSize: 13 }}
                        disabled={actionLoading === req.id}
                      >
                        <Check size={16} />
                        <span>Accept & Chat</span>
                      </button>

                      <button
                        onClick={() => handleBookingAction(req.id, "declined")}
                        className="bb-btn-secondary"
                        style={{ padding: "8px 14px", fontSize: 13, color: "var(--accent-coral-text)" }}
                        disabled={actionLoading === req.id}
                      >
                        <X size={16} />
                        <span>Decline</span>
                      </button>
                    </>
                  )}

                  {req.conversation_id && (
                    <button
                      onClick={() => openChat(req.conversation_id!)}
                      className="bb-btn-secondary"
                      style={{ padding: "8px 14px", fontSize: 13 }}
                    >
                      <MessageSquare size={15} />
                      <span>Chat</span>
                    </button>
                  )}

                  {req.status === "accepted" && (
                    <button
                      onClick={() => handleBookingAction(req.id, "completed")}
                      className="bb-btn-yellow"
                      style={{ padding: "8px 14px", fontSize: 13 }}
                      disabled={actionLoading === req.id}
                    >
                      Mark Item Returned
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* MY LISTINGS TAB */
        myListings.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>You haven't listed any items yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>List lab coats, calculators, textbooks, or sports gear to start earning!</p>
            <button onClick={() => setCurrentTab("share")} className="bb-btn-coral" style={{ marginTop: 14 }}>
              List Your First Item
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {myListings.map((item) => (
              <div key={item.id} className="bb-card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", width: "100%", height: 160, background: "var(--bg-surface-soft)" }}>
                  {item.primary_image ? (
                    <img
                      src={`http://localhost:5000${item.primary_image}`}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                      <Package size={36} />
                    </div>
                  )}

                  <div style={{ position: "absolute", top: 10, left: 10 }}>
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                      ₹{item.rental_price_per_day} / day • {item.pickup_location}
                    </p>

                    {item.status === "rejected" && item.rejection_reason && (
                      <p style={{ fontSize: 12, color: "var(--accent-coral-text)", background: "var(--accent-coral-light)", padding: "6px 10px", borderRadius: "var(--radius-sm)", marginBottom: 8 }}>
                        <strong>Rejection Reason:</strong> {item.rejection_reason}
                      </p>
                    )}

                    {item.status === "pending" && (
                      <p style={{ fontSize: 12, color: "var(--accent-yellow-text)", background: "var(--accent-yellow-light)", padding: "6px 10px", borderRadius: "var(--radius-sm)", marginBottom: 8 }}>
                        ⏳ Awaiting admin review (SM 471) before public display.
                      </p>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      style={{ color: "var(--accent-coral)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Trash2 size={14} />
                      <span>Withdraw Listing</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
