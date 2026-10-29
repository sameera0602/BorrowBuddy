import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { HelpRequest } from "../types";
import { 
  PlusCircle, 
  Calendar, 
  X, 
  ShieldAlert,
  MessageCircle
} from "lucide-react";

export function HelpBuddyPage() {
  const { user, openChat, setCurrentTab } = useAuth();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("All");
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [offeringRequest, setOfferingRequest] = useState<HelpRequest | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Docs and Formatting");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Offer states
  const [offerMsg, setOfferMsg] = useState("");
  const [offerQuote, setOfferQuote] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState("");

  const categories = [
    "All",
    "General Campus Favor",
    "Borrowing Item Request",
    "Study Notes & Materials",
    "Docs and Formatting",
    "Slides and Design",
    "Proofread and Polish",
    "Study Together",
    "Peer Tutoring",
    "Project Support"
  ];

  async function handleStartChat(requestId: number) {
    setChatLoadingId(requestId);
    try {
      const res = await api.startDirectChat({ helpRequestId: requestId });
      if (res.success && res.conversationId) {
        openChat(res.conversationId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open chat with student.");
    } finally {
      setChatLoadingId(null);
    }
  }

  useEffect(() => {
    fetchHelpRequests();
  }, [selectedCat]);

  async function fetchHelpRequests() {
    setLoading(true);
    try {
      const res = await api.getHelpRequests({
        category: selectedCat
      });
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error("Fetch help requests error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      await api.createHelpRequest({
        title: newTitle,
        category: newCategory,
        description: newDesc,
        deadline: newDeadline || undefined,
        budget: newBudget ? parseFloat(newBudget) : 0
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setNewBudget("");
      await fetchHelpRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create help request.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offeringRequest) return;
    setOfferError("");
    setOfferLoading(true);

    try {
      await api.submitHelpOffer(offeringRequest.id, {
        message: offerMsg,
        priceQuote: offerQuote ? parseFloat(offerQuote) : 0
      });
      setOfferingRequest(null);
      setOfferMsg("");
      setOfferQuote("");
      alert("Your offer has been submitted! Check My Chats when the requester responds.");
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : "Failed to submit offer.");
    } finally {
      setOfferLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            Help a Buddy — Academic Support
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Collaborate on document formatting, presentation polishing, proofreading, and peer tutoring.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setCurrentTab("my-help")}
            className="bb-btn-secondary"
          >
            My Help Requests
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bb-btn-coral"
          >
            <PlusCircle size={17} />
            <span>Post Help Request</span>
          </button>
        </div>
      </div>

      {/* Academic Integrity & Admin Monitoring Campus Disclaimer */}
      <div
        style={{
          background: "var(--primary-light)",
          border: "1px solid rgba(19, 34, 56, 0.15)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12
        }}
      >
        <ShieldAlert size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.5 }}>
          <strong>Public Campus Favor Board:</strong> Need a favor, notes, or academic support? Post it here publicly where everyone can find it! Interested peers can direct message (DM) you immediately to chat 1-on-1 in private. <em>All student communications are monitored by campus moderators (Roll SM 471) to ensure safety and academic integrity.</em>
        </div>
      </div>

      {/* Category Pills */}
      <div className="bb-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: 12.5,
                fontWeight: 600,
                background: selectedCat === cat ? "var(--primary)" : "var(--bg-canvas)",
                color: selectedCat === cat ? "#FFFFFF" : "var(--text-main)",
                border: "1px solid",
                borderColor: selectedCat === cat ? "var(--primary)" : "var(--border-color)"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading student help requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bb-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>No open requests in this category.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Need help formatting a paper or preparing slides? Post a request!</p>
          <button onClick={() => setShowCreateModal(true)} className="bb-btn-coral" style={{ marginTop: 14 }}>
            Create First Request
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {requests.map((r) => (
            <div key={r.id} className="bb-card" style={{ padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span className="bb-badge bb-badge-open">{r.category}</span>
                  {r.budget && Number(r.budget) > 0 ? (
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-coral)" }}>
                      Budget: ₹{r.budget}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                      Open to quotes
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>
                  {r.title}
                </h3>

                <p style={{ fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.6, marginBottom: 14, whiteSpace: "pre-line" }}>
                  {r.description}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
                  <span>Requested by {r.requester_name}</span>
                  {r.deadline && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={13} />
                      <span>Due: {new Date(r.deadline).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                {r.requester_id === user?.id ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", textAlign: "center" }}>
                    (Your own post — view incoming DMs in My Chats)
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleStartChat(r.id)}
                      className="bb-btn-coral"
                      style={{
                        flex: 1.2,
                        padding: "9px 12px",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6
                      }}
                      disabled={chatLoadingId === r.id}
                      title="Direct message this student in private chat"
                    >
                      <MessageCircle size={15} />
                      <span>{chatLoadingId === r.id ? "Opening DM..." : "DM in Private"}</span>
                    </button>
                    <button
                      onClick={() => setOfferingRequest(r)}
                      className="bb-btn-secondary"
                      style={{ flex: 1, padding: "9px 12px", fontSize: 13 }}
                    >
                      Offer / Quote
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Help Request Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)" }}>Post a Favor or Request (Public)</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: 6, borderRadius: "50%", background: "var(--bg-canvas)" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "10px", background: "var(--accent-coral-light)", color: "var(--accent-coral-text)", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Title / Need</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Need lab coat for Tuesday 2 PM lab / PPT formatting for DBMS"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label>Support Category</label>
                <select
                  className="form-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Detailed Explanation</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Explain what assistance you need (e.g., align report margins and font styles as per IEEE format, or practice DSA mock questions)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label>Deadline (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Budget (₹ INR, Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="e.g. 150"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <button
                  type="button"
                  className="bb-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-btn-coral"
                  style={{ flex: 2 }}
                  disabled={formLoading}
                >
                  {formLoading ? "Posting..." : "Post Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Help Modal */}
      {offeringRequest && (
        <div className="modal-overlay" onClick={() => setOfferingRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span className="bb-badge bb-badge-open">{offeringRequest.category}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", marginTop: 4 }}>
                  Offer Help for "{offeringRequest.title}"
                </h3>
              </div>
              <button onClick={() => setOfferingRequest(null)} style={{ padding: 6, borderRadius: "50%", background: "var(--bg-canvas)" }}>
                <X size={18} />
              </button>
            </div>

            {offerError && (
              <div style={{ padding: "10px", background: "var(--accent-coral-light)", color: "var(--accent-coral-text)", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 14 }}>
                {offerError}
              </div>
            )}

            <form onSubmit={handleSendOffer}>
              <div className="form-group">
                <label>How can you help? (Message to student)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe your skills (e.g. I am proficient in LaTeX, IEEE formatting, or Python and can help you polish the presentation tonight)..."
                  value={offerMsg}
                  onChange={(e) => setOfferMsg(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Proposed Fee / Quote (₹ INR, Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 100 or 0 for free peer help"
                  value={offerQuote}
                  onChange={(e) => setOfferQuote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <button
                  type="button"
                  className="bb-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setOfferingRequest(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bb-btn-primary"
                  style={{ flex: 2 }}
                  disabled={offerLoading}
                >
                  {offerLoading ? "Submitting..." : "Send Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
