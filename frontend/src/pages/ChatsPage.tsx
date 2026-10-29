import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Conversation, ChatMessage } from "../types";
import { 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  ArrowLeft,
  Flag
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

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
  }, [selectedConv]);

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
          Private conversations linked to verified item bookings and academic support.
        </p>
      </div>

      <div
        className="bb-card chats-container"
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          minHeight: 560,
          maxHeight: "75vh",
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
                  Chats are created when a borrow request or academic help offer is accepted.
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
                        {c.type === "booking" ? "Item" : "Help"}
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
                  padding: "14px 18px",
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
                      {selectedConv.other_user?.name || "Student"}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Linked to: <strong>{selectedConv.item_title || selectedConv.help_title || "Discussion"}</strong>
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

              {/* Security Banner */}
              <div
                style={{
                  padding: "6px 16px",
                  background: "var(--bg-canvas)",
                  borderBottom: "1px solid var(--border-color)",
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <ShieldAlert size={14} color="var(--primary)" />
                <span>Private student chat. Actively monitored by SRMIST Campus Administration (SM 471) for campus safety, fraud prevention, and academic integrity.</span>
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
                    Start the conversation! Coordinate pickup spot, return timing, or exchange details.
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
                            wordBreak: "break-word"
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
                  placeholder="Type a message (e.g. Can we meet at Library entrance at 4 PM?)..."
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
