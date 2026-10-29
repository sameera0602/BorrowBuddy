import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import type { Listing, HelpRequest } from "../types";
import { BookingModal } from "../components/BookingModal";
import { 
  Package, 
  PlusCircle, 
  HelpCircle, 
  BookOpen, 
  Cpu, 
  FlaskConical, 
  Calculator, 
  Trophy, 
  Shirt, 
  PartyPopper, 
  Layers,
  ArrowRight,
  Sparkles,
  MapPin
} from "lucide-react";

export function HomePage() {
  const { user, setCurrentTab } = useAuth();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [recentHelp, setRecentHelp] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    setLoading(true);
    try {
      const [listingsRes, helpRes] = await Promise.all([
        api.getListings(),
        api.getHelpRequests()
      ]);
      if (listingsRes.success) setFeaturedListings(listingsRes.listings.slice(0, 4));
      if (helpRes.success) setRecentHelp(helpRes.requests.slice(0, 3));
    } catch (err) {
      console.warn("Home data error:", err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { name: "Books and Notes", icon: BookOpen, color: "#3B82F6", bg: "#EFF6FF" },
    { name: "Electronics", icon: Cpu, color: "#8B5CF6", bg: "#F5F3FF" },
    { name: "Lab Equipment", icon: FlaskConical, color: "#10B981", bg: "#ECFDF5" },
    { name: "Calculators", icon: Calculator, color: "#F59E0B", bg: "#FFFBEB" },
    { name: "Sports Equipment", icon: Trophy, color: "#EF4444", bg: "#FEF2F2" },
    { name: "Clothing and Accessories", icon: Shirt, color: "#EC4899", bg: "#FDF2F8" },
    { name: "Event Supplies", icon: PartyPopper, color: "#6366F1", bg: "#EEF2FF" },
    { name: "Other", icon: Layers, color: "#64748B", bg: "#F8FAFC" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* 1. Hero Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #132238 0%, #1D3557 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "36px 28px",
          color: "#FFFFFF",
          boxShadow: "var(--shadow-hover)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ maxWidth: 640, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            <Sparkles size={14} color="var(--accent-yellow)" />
            <span>Welcome back, {user?.fullName || "Student"}!</span>
          </div>

          <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Borrow smart. Share more on campus.
          </h1>

          <p style={{ fontSize: 15, color: "#CBD5E1", marginTop: 12, lineHeight: 1.6 }}>
            Rent calculators, lab coats, notes, and sports kits from verified SRM students in Tiruchirappalli. Or offer academic support services.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            <button
              onClick={() => setCurrentTab("borrow")}
              className="bb-btn-coral"
              style={{ padding: "12px 22px" }}
            >
              <Package size={18} />
              <span>Browse Items to Borrow</span>
            </button>

            <button
              onClick={() => setCurrentTab("share")}
              className="bb-btn-yellow"
              style={{ padding: "12px 22px" }}
            >
              <PlusCircle size={18} />
              <span>List an Item to Rent</span>
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -30,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
            pointerEvents: "none"
          }}
        />
      </section>

      {/* 2. Quick Action Shortcut Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div
          className="bb-card"
          style={{ padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setCurrentTab("borrow")}
        >
          <div>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Package size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>Borrow Something</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Find lab equipment, calculators, textbooks, and gear available right now on campus.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--primary)", fontWeight: 700, fontSize: 13, marginTop: 18 }}>
            <span>Explore Marketplace</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="bb-card"
          style={{ padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setCurrentTab("share")}
        >
          <div>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--accent-coral-light)", color: "var(--accent-coral)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <PlusCircle size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>Share Your Items</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Turn unused equipment into pocket money. List your items safely for college mates.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-coral)", fontWeight: 700, fontSize: 13, marginTop: 18 }}>
            <span>Create a Listing</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div
          className="bb-card"
          style={{ padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setCurrentTab("help")}
        >
          <div>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--accent-yellow-light)", color: "var(--accent-yellow-text)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <HelpCircle size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>Help a Buddy</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Need formatting help, slides polishing, or a study partner? Request or offer academic support.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-yellow-text)", fontWeight: 700, fontSize: 13, marginTop: 18 }}>
            <span>Academic Support</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </section>

      {/* 3. Browse by Campus Categories */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>Browse by Category</h2>
          <button
            onClick={() => setCurrentTab("borrow")}
            style={{ fontSize: 13.5, fontWeight: 600, color: "var(--accent-coral)" }}
          >
            View All
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="bb-card"
                onClick={() => setCurrentTab("borrow")}
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer"
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: cat.bg,
                    color: cat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Icon size={22} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)", lineHeight: 1.3 }}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Featured Listings */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>Available on Campus</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Approved listings from SRM students</p>
          </div>
          <button
            onClick={() => setCurrentTab("borrow")}
            style={{ fontSize: 13.5, fontWeight: 600, color: "var(--primary)" }}
          >
            See All Items →
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: "var(--text-muted)" }}>
            Loading campus listings...
          </div>
        ) : featuredListings.length === 0 ? (
          <div
            className="bb-card"
            style={{
              padding: "40px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bg-canvas)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <Package size={26} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>No approved listings yet</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 420 }}>
              Be the first student to list a calculator, lab equipment, or textbook for your peers!
            </p>
            <button onClick={() => setCurrentTab("share")} className="bb-btn-coral" style={{ marginTop: 8 }}>
              List Your Item
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {featuredListings.map((item) => (
              <div
                key={item.id}
                className="bb-card"
                style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
                {/* Photo preview */}
                <div style={{ position: "relative", width: "100%", height: 170, background: "var(--bg-surface-soft)" }}>
                  {item.primary_image ? (
                    <img
                      src={`http://localhost:5000${item.primary_image}`}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
                      <Package size={40} />
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
                </div>

                {/* Content */}
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                      <MapPin size={13} />
                      <span>{item.pickup_location}</span>
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>Rental Rate</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>
                        ₹{item.rental_price_per_day} <span style={{ fontSize: 11, fontWeight: 500 }}>/day</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedListing(item)}
                      className="bb-btn-coral"
                      style={{ padding: "8px 14px", fontSize: 13 }}
                    >
                      Borrow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Recent Help Requests */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>Academic Peer Requests</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Legitimate tutoring, report formatting & study assistance</p>
          </div>
          <button
            onClick={() => setCurrentTab("help")}
            style={{ fontSize: 13.5, fontWeight: 600, color: "var(--primary)" }}
          >
            All Help Requests →
          </button>
        </div>

        {recentHelp.length === 0 ? (
          <div className="bb-card" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
            No open help requests right now. Got an academic assignment or formatting challenge? Post a request!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {recentHelp.map((req) => (
              <div key={req.id} className="bb-card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span className="bb-badge bb-badge-open">{req.category}</span>
                  {req.budget && Number(req.budget) > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-coral)" }}>
                      Budget: ₹{req.budget}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)", marginBottom: 6 }}>
                  {req.title}
                </h4>

                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {req.description}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: 10, fontSize: 12.5, color: "var(--text-muted)" }}>
                  <span>By {req.requester_name}</span>
                  <button
                    onClick={() => setCurrentTab("help")}
                    style={{ fontWeight: 700, color: "var(--primary)" }}
                  >
                    View & Offer Help →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking Modal */}
      {selectedListing && (
        <BookingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onSuccess={() => {
            setSelectedListing(null);
            setCurrentTab("borrowings");
          }}
        />
      )}
    </div>
  );
}
