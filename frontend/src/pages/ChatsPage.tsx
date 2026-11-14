import React, { useState, useEffect, useRef } from "react";
import { api, getAssetUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Conversation, ChatMessage, Listing } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { BookingModal } from "../components/BookingModal";
import { 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  ArrowLeft,
  Flag,
  Check,
  CheckCircle,
  Package,
  MapPin,
  X
} from "lucide-react";

export function ChatsPage() {
  const { user, activeChatId } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [bookingListing, setBookingListing] = useState<Listing | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Set active chat if passed from context
  useEffect(() => {
    if (activeChatId && conversations.length > 0) {
      const match = conversations.find((c) => c.id === activeChatId);
      if (match) {
        setSelectedConv(match);
      }
    }
  }, [activeChatId, conversations]);

  // Load messages & start polling when selected conversation changes
  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.id);
    const interval = setInterval(() => {
      fetchMessages(selectedConv.id, true);
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    setLoadingConv(true);
    try {
      const res = await api.getConversations();
      if (res.success) {
        setConversations(res.conversations);
        if (!selectedConv && res.conversations.length > 0 && !activeChatId) {
          setSelectedConv(res.conversations[0]);
        }
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoadingConv(false);
    }
  }

  async function fetchMessages(convId: number, silent = false) {
    if (!silent) setLoadingMsg(true);
    try {
      const res = await api.getMessages(convId);
      if (res.success) {
        setMessages(res.messages);
        if (res.conversation) {
          setSelectedConv((prev) => (prev ? { ...prev, ...res.conversation } : res.conversation));
        }
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      if (!silent) setLoadingMsg(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv || !newMessage.trim() || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const res = await api.sendMessage(selectedConv.id, text);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  // Booking actions from inside chat
  async function handleApproveBooking(bookingId: number) {
    setActionLoading(true);
    try {
      await api.updateBookingStatus(bookingId, "accepted");
      await fetchMessages(selectedConv!.id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeclineBooking(bookingId: number) {
    if (!confirm("Are you sure you want to decline this borrow request?")) return;
    setActionLoading(true);
    try {
      await api.updateBookingStatus(bookingId, "declined");
      await fetchMessages(selectedConv!.id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to decline request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmPickup(bookingId: number) {
    setActionLoading(true);
    try {
      const res = await api.confirmPickup(bookingId);
      alert(res.message);
      await fetchMessages(selectedConv!.id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm pickup.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReturn(bookingId: number) {
    setActionLoading(true);
    try {
      const res = await api.confirmReturn(bookingId);
      alert(res.message);
      await fetchMessages(selectedConv!.id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm return.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjustPrice(bookingId: number, currentPrice: number | string) {
    const input = prompt("Enter negotiated total rental price for this booking (₹):", String(currentPrice));
    if (input === null) return;
    const price = parseFloat(input);
    if (isNaN(price) || price < 0) {
      alert("Invalid price.");
      return;
    }
    setActionLoading(true);
    try {
      await api.negotiatePrice(bookingId, price);
      await fetchMessages(selectedConv!.id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update price.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenBookingModal() {
    if (!selectedConv?.item?.id) return;
    try {
      const res = await api.getListing(selectedConv.item.id);
      if (res.success && res.listing) {
        setBookingListing(res.listing);
      }
    } catch (err) {
      alert("Failed to load item for booking.");
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv || !reportReason) return;
    try {
      await api.submitReport({
        targetType: "conversation",
        targetId: selectedConv.id,
        reason: reportReason
      });
      alert("Conversation reported. Campus moderators will review it.");
      setShowReportModal(false);
      setReportReason("");
    } catch (err) {
      alert("Failed to submit report.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
          Campus Messages & Coordination
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>
          Chat personally to negotiate price and meeting spots. Both parties confirm handover & return right here.
        </p>
      </div>

      <div
        className="bb-card chats-container"
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          minHeight: 560,
          maxHeight: "78vh",
          overflow: "hidden"
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .chats-container {
              grid-template-columns: 1fr !important;
            }
            .chats-list-panel {
              display: ${selectedConv ? "none !important" : "flex !important"};
            }
            .chats-messages-panel {
              display: ${selectedConv ? "flex !important" : "none !important"};
            }
          }
        `}</style>

        {/* Left Side: Conversation List */}
        <div
          className="chats-list-panel"
          style={{
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-canvas)"
          }}
        >
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-surface)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>Active Conversations</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingConv ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Loading chats...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <p style={{ fontWeight: 600 }}>No conversations yet.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Click "Chat" on any item in the marketplace or from incoming requests to start negotiating!
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConv?.id === c.id;
                const partnerName = c.other_user?.name || "Student";
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border-color)",
                      background: isSelected ? "var(--primary-light)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>
                        {partnerName}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                        {c.booking_status ? <StatusBadge status={c.booking_status as any} /> : "Item Inquiry"}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>
                      {c.item_title || c.help_title || "Direct Message"}
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {c.last_message?.message_text || "No messages yet"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Message Stream */}
        <div
          className="chats-messages-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)"
          }}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-surface)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => setSelectedConv(null)}
                    style={{ display: "none", padding: 4 }}
                    className="mobile-back-btn"
                  >
                    <style>{`
                      @media (max-width: 768px) {
                        .mobile-back-btn { display: inline-flex !important; }
                      }
                    `}</style>
                    <ArrowLeft size={18} />
                  </button>

                  <div>
                    <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--primary)" }}>
                      {selectedConv.partner?.name || selectedConv.other_user?.name || "Student"}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Item: <strong>{selectedConv.item?.title || selectedConv.item_title || selectedConv.help_title || "Campus Discussion"}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowReportModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-canvas)"
                  }}
                  title="Report unsafe conversation"
                >
                  <Flag size={13} />
                  <span>Report</span>
                </button>
              </div>

              {/* ITEM & BOOKING NEGOTIATION / STATUS PINNED BAR */}
              {selectedConv.item && (
                <div
                  style={{
                    background: "var(--bg-canvas)",
                    borderBottom: "1px solid var(--border-color)",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--bg-surface-soft)", flexShrink: 0 }}>
                      {selectedConv.item.image_url ? (
                        <img
                          src={getAssetUrl(selectedConv.item.image_url)}
                          alt={selectedConv.item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                          <Package size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{selectedConv.item.title}</span>
                        {selectedConv.booking && <StatusBadge status={selectedConv.booking.status} />}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 10, alignItems: "center" }}>
                        <span>₹{selectedConv.item.rental_price_per_day}/day</span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={11} color="var(--accent-coral)" />
                          {selectedConv.item.pickup_location}
                        </span>
                        {selectedConv.booking && (
                          <>
                            <span>•</span>
                            <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                              Total: ₹{selectedConv.booking.total_price}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions according to booking state and user role */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Scenario 1: Inquiry before booking */}
                    {!selectedConv.booking && selectedConv.userRole === "borrower" && (
                      <button
                        onClick={handleOpenBookingModal}
                        className="bb-btn-coral"
                        style={{ padding: "6px 12px", fontSize: 12.5 }}
                      >
                        Request to Borrow
                      </button>
                    )}

                    {/* Scenario 2: Pending booking */}
                    {selectedConv.booking && selectedConv.booking.status === "pending" && (
                      <>
                        {selectedConv.userRole === "lender" ? (
                          <>
                            <button
                              onClick={() => handleAdjustPrice(selectedConv.booking!.id, selectedConv.booking!.total_price)}
                              className="bb-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: 12 }}
                              disabled={actionLoading}
                            >
                              Adjust Price
                            </button>
                            <button
                              onClick={() => handleApproveBooking(selectedConv.booking!.id)}
                              className="bb-btn-primary"
                              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              disabled={actionLoading}
                            >
                              <Check size={14} />
                              <span>Approve Request</span>
                            </button>
                            <button
                              onClick={() => handleDeclineBooking(selectedConv.booking!.id)}
                              className="bb-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: 12, color: "var(--accent-coral-text)" }}
                              disabled={actionLoading}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            ⏳ Waiting for owner to approve or negotiate terms...
                          </span>
                        )}
                      </>
                    )}

                    {/* Scenario 3: Accepted (Handover confirmation) */}
                    {selectedConv.booking && selectedConv.booking.status === "accepted" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {selectedConv.userRole === "borrower" ? (
                          !selectedConv.booking.borrower_confirmed_pickup ? (
                            <button
                              onClick={() => handleConfirmPickup(selectedConv.booking!.id)}
                              className="bb-btn-coral"
                              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              disabled={actionLoading}
                            >
                              <Check size={14} />
                              <span>Confirm Item Received</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent-green-text)", fontWeight: 600 }}>
                              ✓ You confirmed pickup. Waiting for owner...
                            </span>
                          )
                        ) : (
                          !selectedConv.booking.lender_confirmed_pickup ? (
                            <button
                              onClick={() => handleConfirmPickup(selectedConv.booking!.id)}
                              className="bb-btn-coral"
                              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              disabled={actionLoading}
                            >
                              <Check size={14} />
                              <span>Confirm Handed Over</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent-green-text)", fontWeight: 600 }}>
                              ✓ You confirmed handover. Waiting for borrower...
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Scenario 4: Active (Return confirmation) */}
                    {selectedConv.booking && selectedConv.booking.status === "active" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {selectedConv.userRole === "borrower" ? (
                          !selectedConv.booking.borrower_confirmed_return ? (
                            <button
                              onClick={() => handleConfirmReturn(selectedConv.booking!.id)}
                              className="bb-btn-yellow"
                              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              disabled={actionLoading}
                            >
                              <CheckCircle size={14} />
                              <span>Confirm Item Returned</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent-green-text)", fontWeight: 600 }}>
                              ✓ You confirmed return. Waiting for owner receipt...
                            </span>
                          )
                        ) : (
                          !selectedConv.booking.lender_confirmed_return ? (
                            <button
                              onClick={() => handleConfirmReturn(selectedConv.booking!.id)}
                              className="bb-btn-yellow"
                              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              disabled={actionLoading}
                            >
                              <CheckCircle size={14} />
                              <span>Confirm Item Received Back</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent-green-text)", fontWeight: 600 }}>
                              ✓ You confirmed receipt. Waiting for borrower...
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Scenario 5: Completed */}
                    {selectedConv.booking && selectedConv.booking.status === "completed" && (
                      <span style={{ fontSize: 12, color: "var(--accent-green-text)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={14} /> Completed & Returned
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Security Banner */}
              <div
                style={{
                  padding: "5px 16px",
                  background: "var(--bg-canvas)",
                  borderBottom: "1px solid var(--border-color)",
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <ShieldAlert size={13} color="var(--primary)" />
                <span>Private verified SRM student chat. Coordinate meeting place & negotiate respectfully.</span>
              </div>

              {/* Message List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: "#FAF8F3"
                }}
              >
                {loadingMsg ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 24 }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 32 }}>
                    Start the conversation! Coordinate pickup spot, return timing, or negotiate price.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "75%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start"
                        }}
                      >
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)", marginBottom: 2 }}>
                          {isMe ? "You" : m.sender_name || "Student"}
                        </span>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: isMe ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
                            background: isMe ? "var(--primary)" : "var(--bg-surface)",
                            color: isMe ? "#FFFFFF" : "var(--text-main)",
                            fontSize: 13.5,
                            lineHeight: 1.5,
                            boxShadow: "var(--shadow-sm)",
                            border: isMe ? "none" : "1px solid var(--border-color)",
                            wordBreak: "break-word",
                            whiteSpace: "pre-line"
                          }}
                        >
                          {m.message_text}
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text-subtle)", marginTop: 2 }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border-color)",
                  display: "flex",
                  gap: 8,
                  background: "var(--bg-surface)"
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type a message (e.g. Can we meet at Library entrance? Or can you do ₹80?)..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ borderRadius: "var(--radius-md)" }}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="bb-btn-coral"
                  disabled={sending || !newMessage.trim()}
                  style={{ padding: "0 18px", borderRadius: "var(--radius-md)" }}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                gap: 8,
                padding: 24
              }}
            >
              <MessageSquare size={36} color="var(--border-color)" />
              <p style={{ fontSize: 14 }}>Select a conversation from the left to read and send messages.</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal if triggered from chat */}
      {bookingListing && (
        <BookingModal
          listing={bookingListing}
          onClose={() => setBookingListing(null)}
          onSuccess={() => {
            setBookingListing(null);
            loadConversations();
            if (selectedConv) fetchMessages(selectedConv.id);
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>
              Report Inappropriate Conversation
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              If a user is being abusive, demanding off-platform unauthorized payments, or violating campus rules, let our student moderation team know.
            </p>

            <form onSubmit={handleReportSubmit}>
              <div className="form-group">
                <label>Reason for Report</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Explain the safety violation or inappropriate behavior..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="bb-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-btn-coral"
                  style={{ flex: 1 }}
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
