import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Listing } from "../types";
import { BookingModal } from "../components/BookingModal";
import { 
  Search, 
  MapPin, 
  Package, 
  X, 
  User 
} from "lucide-react";

export function BorrowPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<Listing | null>(null);
  const [bookingItem, setBookingItem] = useState<Listing | null>(null);

  const categories = [
    "All",
    "Books and Notes",
    "Electronics",
    "Lab Equipment",
    "Calculators",
    "Sports Equipment",
    "Clothing and Accessories",
    "Event Supplies",
    "Other"
  ];

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedCondition]);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await api.getListings({
        category: selectedCategory,
        condition: selectedCondition,
        search: searchQuery
      });
      if (res.success) {
        setListings(res.listings);
      }
    } catch (err) {
      console.error("Fetch listings error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchListings();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
          Campus Item Marketplace
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Borrow verified gear, lab supplies, and notes directly from fellow SRM students.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bb-card" style={{ padding: "18px 20px" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={18}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by item name, notes subject, lab gear, or pickup location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 42 }}
            />
          </div>
          <button type="submit" className="bb-btn-primary" style={{ padding: "0 22px" }}>
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginRight: 4 }}>Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: 12.5,
                fontWeight: 600,
                background: selectedCategory === cat ? "var(--primary)" : "var(--bg-canvas)",
                color: selectedCategory === cat ? "#FFFFFF" : "var(--text-main)",
                border: "1px solid",
                borderColor: selectedCategory === cat ? "var(--primary)" : "var(--border-color)",
                transition: "all 0.15s ease"
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Condition Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-color)", fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>Condition:</span>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="form-select"
            style={{ width: "auto", padding: "6px 12px", borderRadius: "var(--radius-sm)" }}
          >
            <option value="all">Any Condition</option>
            <option value="brand_new">Brand New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
          Loading marketplace items...
        </div>
      ) : listings.length === 0 ? (
        <div
          className="bb-card"
          style={{
            padding: "50px 24px",
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>No items found</h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 380 }}>
            No approved items match your search or filter right now. Try clearing filters or list your own item!
          </p>
          <button
            onClick={() => {
              setSelectedCategory("All");
              setSelectedCondition("all");
              setSearchQuery("");
            }}
            className="bb-btn-secondary"
            style={{ marginTop: 8 }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {listings.map((item) => (
            <div
              key={item.id}
              className="bb-card"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "pointer"
              }}
              onClick={() => setActiveItem(item)}
            >
              {/* Photo */}
              <div style={{ position: "relative", width: "100%", height: 190, background: "var(--bg-surface-soft)" }}>
                {item.primary_image ? (
                  <img
                    src={`http://localhost:5000${item.primary_image}`}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                    <Package size={44} />
                  </div>
                )}
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: "rgba(19, 34, 56, 0.85)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6
                  }}
                >
                  {item.category}
                </span>

                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    background: "#FFFFFF",
                    color: "var(--primary)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                  }}
                >
                  {item.item_condition.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div style={{ padding: "18px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)", marginBottom: 6 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
                    <MapPin size={14} color="var(--accent-coral)" />
                    <span>{item.pickup_location}</span>
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>Rental Charge</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>
                      ₹{item.rental_price_per_day} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/ day</span>
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookingItem(item);
                    }}
                    className="bb-btn-coral"
                    style={{ padding: "8px 16px", fontSize: 13 }}
                  >
                    Borrow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Details Modal */}
      {activeItem && (
        <div className="modal-overlay" onClick={() => setActiveItem(null)}>
          <div className="modal-content" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span className="campus-pill" style={{ marginBottom: 6 }}>{activeItem.category}</span>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{activeItem.title}</h2>
              </div>
              <button onClick={() => setActiveItem(null)} style={{ padding: 6, borderRadius: "50%", background: "var(--bg-canvas)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Photos Carousel */}
            {activeItem.images && activeItem.images.length > 0 && (
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, marginBottom: 18 }}>
                {activeItem.images.map((img, i) => (
                  <img
                    key={i}
                    src={`http://localhost:5000${img}`}
                    alt={`${activeItem.title} ${i}`}
                    style={{
                      width: activeItem.images.length === 1 ? "100%" : 220,
                      height: 190,
                      objectFit: "cover",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)"
                    }}
                  />
                ))}
              </div>
            )}

            {/* Price & Deposit */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                background: "var(--bg-canvas)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: 18
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Rental Price</span>
                <p style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>
                  ₹{activeItem.rental_price_per_day} <span style={{ fontSize: 12, fontWeight: 500 }}>/ day</span>
                </p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Refundable Deposit</span>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
                  ₹{activeItem.deposit_amount || "0"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>Description</h4>
              <p style={{ fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {activeItem.description}
              </p>
            </div>

            {/* Rules */}
            {activeItem.rules && (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>Owner's Rental Rules</h4>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {activeItem.rules}
                </p>
              </div>
            )}

            {/* Owner Public Information for Safe Campus Transaction */}
            <div
              style={{
                borderTop: "1px solid var(--border-color)",
                paddingTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <User size={18} />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", display: "block" }}>
                    Listed by {activeItem.owner_name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Verified SRM Student • {activeItem.pickup_location}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="bb-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setActiveItem(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="bb-btn-coral"
                style={{ flex: 2 }}
                onClick={() => {
                  setBookingItem(activeItem);
                  setActiveItem(null);
                }}
              >
                Request to Borrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Date Modal */}
      {bookingItem && (
        <BookingModal
          listing={bookingItem}
          onClose={() => setBookingItem(null)}
          onSuccess={() => {
            setBookingItem(null);
            fetchListings();
          }}
        />
      )}
    </div>
  );
}
