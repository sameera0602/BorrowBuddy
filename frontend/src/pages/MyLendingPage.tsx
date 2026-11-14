import { useState, useEffect } from "react";
import { api, getAssetUrl } from "../services/api";
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
  PlusCircle,
  Clock,
  CheckCircle
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

  async function handleOpenChat(req: Booking) {
    if (req.conversation_id) {
      openChat(req.conversation_id);
    } else {
      setActionLoading(req.id);
      try {
        const res = await api.startItemChat(req.listing_id);
        if (res.success && res.conversationId) {
          openChat(res.conversationId);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to open chat with borrower.");
      } finally {
        setActionLoading(null);
      }
    }
  }

  async function handleBookingAction(bookingId: number, newStatus: "accepted" | "declined") {
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

  async function handleConfirmPickup(bookingId: number) {
    setActionLoading(bookingId);
    try {
      const res = await api.confirmPickup(bookingId);
      alert(res.message);
      await loadLendingData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm handover.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmReturn(bookingId: number) {
    setActionLoading(bookingId);
    try {
      const res = await api.confirmReturn(bookingId);
      alert(res.message);
      await loadLendingData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm return.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleNegotiatePrice(bookingId: number, currentPrice: number | string) {
    const input = prompt("Enter agreed total rental price for this booking (₹):", String(currentPrice));
    if (input === null) return;
    const price = parseFloat(input);
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price.");
      return;
    }
    setActionLoading(bookingId);
    try {
      await api.negotiatePrice(bookingId, price);
      alert(`Agreed price updated to ₹${price}!`);
      await loadLendingData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update price.");
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
            Chat personally with borrowers to negotiate, approve requests, and mutually confirm handover & returns.
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
            {incomingRequests.map((req) => {
              const borrowerConfirmedPickup = Boolean(req.borrower_confirmed_pickup);
              const lenderConfirmedPickup = Boolean(req.lender_confirmed_pickup);
              const borrowerConfirmedReturn = Boolean(req.borrower_confirmed_return);
              const lenderConfirmedReturn = Boolean(req.lender_confirmed_return);

              return (
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>
                        {req.item_title}
                      </h3>
                      <StatusBadge status={req.status} />
                    </div>

                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Borrower: <strong>{req.borrower_name}</strong> ({req.borrower_email})
                    </p>

                    <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--text-main)", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={14} color="var(--primary)" />
                        <span>{new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}</span>
                      </span>

                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                        Total: ₹{req.total_price} {req.agreed_price ? `(Negotiated: ₹${req.agreed_price})` : ""}
                      </span>

                      {req.status === "pending" && (
                        <button
                          onClick={() => handleNegotiatePrice(req.id, req.agreed_price || req.total_price)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "underline"
                          }}
                        >
                          Adjust Price
                        </button>
                      )}
                    </div>

                    {req.borrower_notes && (
                      <div style={{ background: "var(--bg-canvas)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 12.5, marginTop: 4 }}>
                        <strong>Borrower message:</strong> {req.borrower_notes}
                      </div>
                    )}

                    {/* Dual-Confirmation Handover Box (When Accepted) */}
                    {req.status === "accepted" && (
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
                          <span style={{ color: lenderConfirmedPickup ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                            {lenderConfirmedPickup ? "✓ You handed over item" : "⏳ You haven't confirmed handover"}
                          </span>
                          <span style={{ color: borrowerConfirmedPickup ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                            {borrowerConfirmedPickup ? "✓ Borrower received item" : "⏳ Borrower hasn't confirmed receipt"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dual-Confirmation Return Box (When Active) */}
                    {req.status === "active" && (
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
                          <span style={{ color: lenderConfirmedReturn ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                            {lenderConfirmedReturn ? "✓ You received item back" : "⏳ You haven't confirmed return"}
                          </span>
                          <span style={{ color: borrowerConfirmedReturn ? "var(--accent-green-text)" : "var(--text-muted)" }}>
                            {borrowerConfirmedReturn ? "✓ Borrower marked returned" : "⏳ Borrower hasn't marked returned"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", minWidth: 175 }}>
                    {/* Always visible Chat button to negotiate or coordinate personally */}
                    <button
                      onClick={() => handleOpenChat(req)}
                      className="bb-btn-secondary"
                      style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <MessageSquare size={15} />
                      <span>Chat with Borrower</span>
                    </button>

                    {req.status === "pending" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleBookingAction(req.id, "accepted")}
                          className="bb-btn-primary"
                          style={{ flex: 1, padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                          disabled={actionLoading === req.id}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleBookingAction(req.id, "declined")}
                          className="bb-btn-secondary"
                          style={{ padding: "8px 12px", fontSize: 13, color: "var(--accent-coral-text)" }}
                          disabled={actionLoading === req.id}
                        >
                          <X size={16} />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {/* Handover: Confirm Handed Over when accepted */}
                    {req.status === "accepted" && !lenderConfirmedPickup && (
                      <button
                        onClick={() => handleConfirmPickup(req.id)}
                        className="bb-btn-coral"
                        style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        disabled={actionLoading === req.id}
                      >
                        <Check size={16} />
                        <span>Confirm Handed Over</span>
                      </button>
                    )}

                    {req.status === "accepted" && lenderConfirmedPickup && !borrowerConfirmedPickup && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px" }}>
                        Waiting for borrower to confirm receipt...
                      </span>
                    )}

                    {/* Return: Confirm Received Back when active */}
                    {req.status === "active" && !lenderConfirmedReturn && (
                      <button
                        onClick={() => handleConfirmReturn(req.id)}
                        className="bb-btn-yellow"
                        style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        disabled={actionLoading === req.id}
                      >
                        <CheckCircle size={15} />
                        <span>Confirm Item Received Back</span>
                      </button>
                    )}

                    {req.status === "active" && lenderConfirmedReturn && !borrowerConfirmedReturn && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px" }}>
                        Waiting for borrower to confirm return...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* MY LISTINGS TAB */
        myListings.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>You haven't listed any items yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>List lab coats, calculators, textbooks, or sports gear to start earning!</p>
            <button onClick={() => setCurrentTab("share")} className="bb-btn-coral" style={{ marginTop: 14 }}>
              + List an Item Now
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {myListings.map((item) => (
              <div
                key={item.id}
                className="bb-card"
                style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
                <div style={{ position: "relative", width: "100%", height: 160, background: "var(--bg-surface-soft)" }}>
                  {item.primary_image ? (
                    <img
                      src={getAssetUrl(item.primary_image)}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                      <Package size={36} />
                    </div>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10
                    }}
                  >
                    <StatusBadge status={item.status} />
                  </span>
                </div>

                <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                      ₹{item.rental_price_per_day} / day • {item.pickup_location}
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      className="bb-btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 12, color: "var(--accent-coral-text)", borderColor: "var(--border-color)" }}
                      title="Withdraw listing"
                    >
                      <Trash2 size={14} />
                      <span>Withdraw</span>
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
