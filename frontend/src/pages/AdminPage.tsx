import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Listing, Report, ModerationLog } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { 
  Check, 
  X, 
  AlertTriangle, 
  Package,
  RefreshCw,
  MessageSquare,
  Trash2,
  Eye
} from "lucide-react";

export function AdminPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"pending" | "all" | "help" | "chats" | "reports" | "audit">("pending");
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Reject modal state
  const [rejectItem, setRejectItem] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Inspect photos modal
  const [inspectListing, setInspectListing] = useState<Listing | null>(null);

  // Inspect chat transcript modal
  const [inspectConv, setInspectConv] = useState<any | null>(null);
  const [inspectMessages, setInspectMessages] = useState<any[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      loadAdminData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab]);

  async function loadAdminData(silent = false) {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      if (activeTab === "pending") {
        const res = await api.getPendingListings();
        if (res.success) setPendingListings(res.listings);
      } else if (activeTab === "all") {
        const res = await api.getAllListingsAdmin();
        if (res.success) setAllListings(res.listings);
      } else if (activeTab === "help") {
        const res = await api.getHelpRequestsAdmin();
        if (res.success) setHelpRequests(res.requests);
      } else if (activeTab === "chats") {
        const res = await api.getAdminConversations();
        if (res.success) setAdminConversations(res.conversations);
      } else if (activeTab === "reports") {
        const res = await api.getReportsAdmin();
        if (res.success) setReports(res.reports);
      } else if (activeTab === "audit") {
        const res = await api.getAuditLogsAdmin();
        if (res.success) setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleInspectConv(conv: any) {
    setInspectConv(conv);
    setLoadingTranscript(true);
    try {
      const res = await api.getAdminConversationMessages(conv.id);
      if (res.success) {
        setInspectMessages(res.messages);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load chat transcript.");
    } finally {
      setLoadingTranscript(false);
    }
  }

  async function handleDeleteMessage(msgId: number) {
    if (!confirm("Are you sure you want to delete this message as an administrator?")) return;
    try {
      await api.deleteMessageAdmin(msgId);
      setInspectMessages((prev) => prev.filter((m) => m.id !== msgId));
      await loadAdminData(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete message.");
    }
  }

  async function handleUpdateHelpStatus(requestId: number, newStatus: string) {
    setActionLoading(requestId);
    try {
      await api.updateHelpRequestStatusAdmin(requestId, newStatus);
      await loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update request.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(listingId: number) {
    setActionLoading(listingId);
    try {
      await api.approveListing(listingId);
      await loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve listing.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectItem || !rejectReason.trim()) return;

    setActionLoading(rejectItem.id);
    try {
      await api.rejectListing(rejectItem.id, rejectReason.trim());
      setRejectItem(null);
      setRejectReason("");
      await loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject listing.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspendToggle(listingId: number, currentStatus: string) {
    const willSuspend = currentStatus !== "suspended";
    setActionLoading(listingId);
    try {
      await api.suspendListingAdmin(listingId, willSuspend);
      await loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update listing status.");
    } finally {
      setActionLoading(null);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
        <div className="bb-card" style={{ padding: "40px 24px" }}>
          <AlertTriangle size={48} color="var(--accent-coral)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>Access Restricted</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>
            Only authorized campus moderators (Roll number SM 471) can access the BorrowBuddy moderation console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="campus-pill" style={{ background: "var(--primary)", color: "var(--accent-yellow)", borderColor: "var(--primary)" }}>
              Authorized Admin (Roll No: SM 471)
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            Campus Moderation Console
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
            Review pending listings, inspect uploaded photos, audit logs, and keep the campus marketplace safe.
          </p>
        </div>

        <button
          onClick={() => loadAdminData(false)}
          className="bb-btn-secondary"
          style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
          disabled={refreshing}
          title="Refresh listings and requests"
        >
          <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          <span>{refreshing ? "Refreshing..." : "Refresh Console"}</span>
        </button>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-color)", paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "pending" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "pending" ? "var(--primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>Pending Approvals</span>
          {pendingListings.length > 0 && (
            <span style={{ background: "var(--accent-coral)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
              {pendingListings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "all" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "all" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          All Listings
        </button>

        <button
          onClick={() => setActiveTab("help")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "help" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "help" ? "var(--primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>Help Requests</span>
          {helpRequests.length > 0 && (
            <span style={{ background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
              {helpRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("chats")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "chats" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "chats" ? "var(--primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>Live Chat Monitor</span>
          {adminConversations.length > 0 && (
            <span style={{ background: "var(--accent-coral)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
              {adminConversations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "reports" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "reports" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          User Reports
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            borderBottom: activeTab === "audit" ? "3px solid var(--primary)" : "3px solid transparent",
            color: activeTab === "audit" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          Audit History
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading moderation records...
        </div>
      ) : activeTab === "pending" ? (
        /* PENDING LISTINGS TAB */
        pendingListings.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <Check size={36} color="var(--accent-green)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>All caught up!</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>There are no pending listings awaiting approval right now.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {pendingListings.map((item) => (
              <div
                key={item.id}
                className="bb-card pending-admin-card"
                style={{
                  padding: "24px",
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto",
                  gap: 20,
                  alignItems: "center"
                }}
              >
                <style>{`
                  @media (max-width: 768px) {
                    .pending-admin-card {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>

                {/* Photo Viewer Thumbnail */}
                <div
                  style={{
                    width: 140,
                    height: 110,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface-soft)",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative"
                  }}
                  onClick={() => setInspectListing(item)}
                >
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={`http://localhost:5000${item.images[0]}`}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                      <Package size={32} />
                    </div>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      background: "rgba(19, 34, 56, 0.8)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4
                    }}
                  >
                    {item.images?.length || 0} photos
                  </span>
                </div>

                {/* Details */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="campus-pill">{item.category}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                      Condition: {item.item_condition.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{item.title}</h3>

                  <p style={{ fontSize: 13, color: "var(--text-main)", margin: "6px 0", lineHeight: 1.5 }}>
                    {item.description}
                  </p>

                  <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--text-muted)" }}>
                    <span>Owner: <strong>{item.owner_name}</strong> ({item.owner_email})</span>
                    <span>Rate: <strong>₹{item.rental_price_per_day}/day</strong></span>
                    <span>Deposit: <strong>₹{item.deposit_amount || 0}</strong></span>
                    <span>Location: <strong>{item.pickup_location}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="bb-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 13, background: "var(--accent-green-text)" }}
                    disabled={actionLoading === item.id}
                  >
                    <Check size={16} />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => setRejectItem(item)}
                    className="bb-btn-secondary"
                    style={{ padding: "8px 14px", fontSize: 13, color: "var(--accent-coral-text)" }}
                    disabled={actionLoading === item.id}
                  >
                    <X size={16} />
                    <span>Reject...</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "all" ? (
        /* ALL LISTINGS TAB */
        <div className="bb-card" style={{ padding: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Title</th>
                  <th style={{ padding: "10px" }}>Owner</th>
                  <th style={{ padding: "10px" }}>Rate</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {allListings.map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 700 }}>#{l.id}</td>
                    <td style={{ padding: "12px 10px", fontWeight: 600 }}>{l.title}</td>
                    <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>{l.owner_name}</td>
                    <td style={{ padding: "12px 10px" }}>₹{l.rental_price_per_day}/day</td>
                    <td style={{ padding: "12px 10px" }}>
                      <StatusBadge status={l.status} />
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <button
                        onClick={() => handleSuspendToggle(l.id, l.status)}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: l.status === "suspended" ? "var(--accent-green-text)" : "var(--accent-coral)",
                          padding: "4px 8px"
                        }}
                      >
                        {l.status === "suspended" ? "Restore" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "help" ? (
        /* HELP REQUESTS TAB */
        helpRequests.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <Check size={36} color="var(--accent-green)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>No Help Requests Found</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>Students have not posted any academic help requests yet.</p>
          </div>
        ) : (
          <div className="bb-card" style={{ padding: 20 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>ID</th>
                    <th style={{ padding: "10px" }}>Title & Category</th>
                    <th style={{ padding: "10px" }}>Student</th>
                    <th style={{ padding: "10px" }}>Budget</th>
                    <th style={{ padding: "10px" }}>Offers</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {helpRequests.map((hr) => (
                    <tr key={hr.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 10px", fontWeight: 700 }}>#{hr.id}</td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontWeight: 600, color: "var(--primary)" }}>{hr.title}</div>
                        <span className="campus-pill" style={{ fontSize: 11, marginTop: 4 }}>{hr.category}</span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontWeight: 600 }}>{hr.requester_name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{hr.requester_email}</div>
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                        {parseFloat(hr.budget) > 0 ? `₹${hr.budget}` : "Free"}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span style={{ fontWeight: 700 }}>{hr.offer_count} offers</span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <StatusBadge status={hr.status} />
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        {hr.status === "open" ? (
                          <button
                            onClick={() => handleUpdateHelpStatus(hr.id, "cancelled")}
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "var(--accent-coral)",
                              padding: "4px 8px"
                            }}
                            disabled={actionLoading === hr.id}
                          >
                            Close Request
                          </button>
                        ) : hr.status === "cancelled" ? (
                          <button
                            onClick={() => handleUpdateHelpStatus(hr.id, "open")}
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "var(--accent-green-text)",
                              padding: "4px 8px"
                            }}
                            disabled={actionLoading === hr.id}
                          >
                            Re-Open
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === "chats" ? (
        /* LIVE CHAT SURVEILLANCE TAB */
        adminConversations.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <Check size={36} color="var(--accent-green)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>No Active Student Chats</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>Students haven't exchanged any private messages yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Surveillance Notice */}
            <div
              style={{
                background: "var(--primary)",
                color: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MessageSquare size={22} color="var(--accent-yellow)" />
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700 }}>Real-Time Campus Message Surveillance</h4>
                  <p style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
                    Every 1-on-1 private DM is logged and monitored under SRMIST roll SM 471 to prevent fraud, harassment, and exam proxy cheating.
                  </p>
                </div>
              </div>
              <span className="campus-pill" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF", borderColor: "rgba(255,255,255,0.2)" }}>
                {adminConversations.length} Active Rooms
              </span>
            </div>

            <div className="bb-card" style={{ padding: 20 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "10px" }}>ID</th>
                      <th style={{ padding: "10px" }}>Context / Reason</th>
                      <th style={{ padding: "10px" }}>Student 1</th>
                      <th style={{ padding: "10px" }}>Student 2</th>
                      <th style={{ padding: "10px" }}>Messages</th>
                      <th style={{ padding: "10px" }}>Latest Message</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Surveillance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminConversations.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "12px 10px", fontWeight: 700 }}>#{c.id}</td>
                        <td style={{ padding: "12px 10px" }}>
                          <span className="campus-pill" style={{ fontSize: 11, marginBottom: 4, display: "inline-block" }}>
                            {c.type === "booking" ? "Item Rental" : "Campus Favor / Help"}
                          </span>
                          <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                            {c.item_title || c.help_title || "Direct Message"}
                          </div>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ fontWeight: 600 }}>{c.user1_name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.user1_email}</div>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ fontWeight: 600 }}>{c.user2_name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.user2_email}</div>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                            {c.message_count} msgs
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px", maxWidth: 220 }}>
                          {c.last_message ? (
                            <div>
                              <div style={{ fontSize: 12.5, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                "{c.last_message.message_text}"
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>
                                {new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No messages yet</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleInspectConv(c)}
                            className="bb-btn-primary"
                            style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <Eye size={14} />
                            <span>Inspect Transcript</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : activeTab === "reports" ? (
        /* REPORTS TAB */
        reports.length === 0 ? (
          <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            No user reports filed.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {reports.map((r) => (
              <div key={r.id} className="bb-card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <span className="campus-pill" style={{ background: "var(--accent-coral-light)", color: "var(--accent-coral-text)", borderColor: "var(--accent-coral)" }}>
                      Report on {r.target_type} #{r.target_id}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                      By {r.reporter_name} ({r.reporter_email})
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>
                  Reason: {r.reason}
                </p>
                {r.details && (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    Details: {r.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )) : (
          /* AUDIT LOGS TAB */
          auditLogs.length === 0 ? (
            <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="bb-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "12px 14px",
                      background: "var(--bg-canvas)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: 13
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>{log.action}</span>
                      <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>•</span>
                      <span style={{ color: "var(--text-main)" }}>{log.notes}</span>
                    </div>
                    <div style={{ color: "var(--text-subtle)", fontSize: 12 }}>
                      By {log.admin_name} • {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

      {/* Rejection Reason Modal */}
      {rejectItem && (
        <div className="modal-overlay" onClick={() => setRejectItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>
              Reject Listing: "{rejectItem.title}"
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Provide a clear reason so the student knows what to correct (e.g. blurry photo, unacceptable item, improper description).
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label>Rejection Reason</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Please provide a clear, non-blurry photo of the calculator display and state battery condition."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="bb-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setRejectItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-btn-coral"
                  style={{ flex: 1 }}
                  disabled={actionLoading === rejectItem.id}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Photos Modal */}
      {inspectListing && (
        <div className="modal-overlay" onClick={() => setInspectListing(null)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>
                Photos for "{inspectListing.title}"
              </h3>
              <button onClick={() => setInspectListing(null)} style={{ padding: 6, borderRadius: "50%", background: "var(--bg-canvas)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {inspectListing.images?.map((img, i) => (
                <img
                  key={i}
                  src={`http://localhost:5000${img}`}
                  alt={`photo ${i}`}
                  style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inspect Chat Transcript Modal (Surveillance) */}
      {inspectConv && (
        <div className="modal-overlay" onClick={() => setInspectConv(null)}>
          <div className="modal-content" style={{ maxWidth: 680, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <span className="campus-pill" style={{ background: "var(--primary)", color: "var(--accent-yellow)", fontSize: 11, borderColor: "var(--primary)" }}>
                  Admin Active Surveillance
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", marginTop: 6 }}>
                  Chat Room #{inspectConv.id}: {inspectConv.item_title || inspectConv.help_title || "Direct Message"}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                  Between <strong>{inspectConv.user1_name}</strong> ({inspectConv.user1_email}) &amp; <strong>{inspectConv.user2_name}</strong> ({inspectConv.user2_email})
                </p>
              </div>
              <button onClick={() => setInspectConv(null)} style={{ padding: 6, borderRadius: "50%", background: "var(--bg-canvas)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px", display: "flex", flexDirection: "column", gap: 12, minHeight: 250, maxHeight: 420 }}>
              {loadingTranscript ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  Decrypting and loading transcript...
                </div>
              ) : inspectMessages.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  No messages have been exchanged in this room yet.
                </div>
              ) : (
                inspectMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-canvas)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary)" }}>
                          {msg.sender_name}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                          ({msg.sender_email}) • {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {msg.message_text}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      style={{
                        padding: "6px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--accent-coral)",
                        background: "var(--accent-coral-light)",
                        border: "none",
                        cursor: "pointer"
                      }}
                      title="Delete inappropriate message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Auditor: Roll SM 471 (Admin Console)
              </span>
              <button onClick={() => setInspectConv(null)} className="bb-btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
