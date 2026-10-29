import React, { useState } from "react";
import type { Listing } from "../types";
import { api } from "../services/api";
import { AlertCircle, X, Check } from "lucide-react";

interface BookingModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ listing, onClose, onSuccess }: BookingModalProps) {
  if (!listing) return null;

  const currentListing = listing;
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Calculate rental days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const pricePerDay = parseFloat(String(currentListing.rental_price_per_day)) || 0;
  const totalPrice = days * pricePerDay;
  const deposit = parseFloat(String(currentListing.deposit_amount)) || 0;

  // Check overlap with booked ranges
  const hasConflict = currentListing.booked_ranges?.some((range) => {
    const rangeStart = new Date(range.start_date).toISOString().split("T")[0];
    const rangeEnd = new Date(range.end_date).toISOString().split("T")[0];
    return !(endDate < rangeStart || startDate > rangeEnd);
  });

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (hasConflict) {
      setError("This item is already reserved for part of these dates. Please adjust your dates.");
      return;
    }

    setLoading(true);
    try {
      await api.createBooking({
        listingId: currentListing.id,
        startDate,
        endDate,
        borrowerNotes: notes
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit booking request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)" }}>Request to Borrow</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{currentListing.title}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: "50%",
              color: "var(--text-muted)",
              background: "var(--bg-canvas)"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--accent-green-light)",
                color: "var(--accent-green-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <Check size={28} />
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>Request Sent!</h4>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6 }}>
              The owner ({currentListing.owner_name}) has received your booking request. Check My Borrowings for updates.
            </p>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit}>
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-coral-light)",
                  color: "var(--accent-coral-text)",
                  fontSize: 13,
                  marginBottom: 16
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Date Pickers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {hasConflict && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--accent-yellow-light)",
                  color: "var(--accent-yellow-text)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 16
                }}
              >
                ⚠️ Selected dates conflict with an existing reservation for this item.
              </div>
            )}

            {/* Price Breakdown */}
            <div
              style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: 16
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}>
                <span>Rental duration:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{days} {days === 1 ? "day" : "days"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}>
                <span>Rate per day:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>₹{pricePerDay}</span>
              </div>
              {deposit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}>
                  <span>Security deposit (refundable):</span>
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>₹{deposit}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--primary)",
                  borderTop: "1px dashed var(--border-color)",
                  paddingTop: 8,
                  marginTop: 6
                }}
              >
                <span>Estimated Total:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>

            {/* Borrower Notes */}
            <div className="form-group">
              <label>Message to Owner (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Mention preferred pickup time on campus, lab/hostel location, or any questions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                type="button"
                className="bb-btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bb-btn-coral"
                style={{ flex: 2 }}
                disabled={loading || hasConflict}
              >
                {loading ? "Sending Request..." : "Confirm & Send Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
