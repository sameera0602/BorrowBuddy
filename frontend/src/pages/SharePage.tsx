import React, { useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ImageUpload } from "../components/ImageUpload";
import { PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";

export function SharePage() {
  const { user, setCurrentTab } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Books and Notes");
  const [description, setDescription] = useState("");
  const [itemCondition, setItemCondition] = useState("good");
  const [rentalPricePerDay, setRentalPricePerDay] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [pickupLocation, setPickupLocation] = useState("SRMIST Main Campus / Tech Park");
  const [rules, setRules] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const categories = [
    "Books and Notes",
    "Electronics",
    "Lab Equipment",
    "Calculators",
    "Sports Equipment",
    "Clothing and Accessories",
    "Event Supplies",
    "Other"
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (images.length === 0) {
      setError("Please upload at least one clear photo of the item.");
      return;
    }

    if (parseFloat(rentalPricePerDay) < 0 || isNaN(parseFloat(rentalPricePerDay))) {
      setError("Please provide a valid rental price per day.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("itemCondition", itemCondition);
      formData.append("rentalPricePerDay", rentalPricePerDay);
      formData.append("depositAmount", depositAmount || "0");
      formData.append("pickupLocation", pickupLocation);
      formData.append("rules", rules);

      images.forEach((img) => {
        formData.append("images", img);
      });

      await api.createListing(formData);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 580, margin: "40px auto", textAlign: "center" }}>
        <div className="bb-card" style={{ padding: "44px 32px" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "var(--accent-green-light)",
              color: "var(--accent-green-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px"
            }}
          >
            <CheckCircle2 size={34} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>Listing Submitted!</h2>
          <p style={{ fontSize: 14.5, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
            Your item has been safely saved to MySQL and is awaiting admin review (roll number SM 471) to ensure campus safety and quality.
          </p>

          <div
            style={{
              background: "var(--bg-canvas)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              marginTop: 24,
              marginBottom: 24,
              fontSize: 13,
              color: "var(--text-muted)",
              textAlign: "left"
            }}
          >
            <strong>What happens next?</strong>
            <ul style={{ paddingLeft: 18, marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>An admin verifies the uploaded photos and rental terms.</li>
              <li>Once approved, your listing appears on the Borrow marketplace.</li>
              <li>You can view, edit, or withdraw it anytime under My Lending.</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setSuccess(false);
                setTitle("");
                setDescription("");
                setRentalPricePerDay("");
                setDepositAmount("");
                setRules("");
                setImages([]);
              }}
              className="bb-btn-secondary"
              style={{ flex: 1, minWidth: 140 }}
            >
              List Another Item
            </button>
            {user?.role === "admin" ? (
              <button
                onClick={() => setCurrentTab("admin")}
                className="bb-btn-primary"
                style={{ flex: 1, minWidth: 160 }}
              >
                Go to Admin Portal
              </button>
            ) : (
              <button
                onClick={() => setCurrentTab("lending")}
                className="bb-btn-primary"
                style={{ flex: 1, minWidth: 140 }}
              >
                Go to My Lending
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
          List an Item for Rent
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Share calculators, lab items, sports equipment, or books with students at SRMIST Tiruchirappalli.
        </p>
      </div>

      <div className="bb-card" style={{ padding: "32px 28px" }}>
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-coral-light)",
              color: "var(--accent-coral-text)",
              fontSize: 13.5,
              fontWeight: 500,
              marginBottom: 20
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Photo Upload Section */}
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14.5 }}>Item Photos (Required)</label>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
              Take or select photos from your device. Real photos help campus students trust your listing.
            </p>
            <ImageUpload files={images} onChange={setImages} maxFiles={5} />
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Item Name / Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Casio fx-991EX Scientific Calculator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
            />
          </div>

          {/* Category & Condition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Condition</label>
              <select
                className="form-select"
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                required
              >
                <option value="brand_new">Brand New (Unused)</option>
                <option value="like_new">Like New (Mint)</option>
                <option value="good">Good (Fully Functional)</option>
                <option value="fair">Fair (Usable with signs of wear)</option>
              </select>
            </div>
          </div>

          {/* Pricing: Rental Charge & Deposit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-group">
              <label>Rental Charge per Day (₹ INR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="e.g. 50"
                value={rentalPricePerDay}
                onChange={(e) => setRentalPricePerDay(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Security Deposit (₹ INR, Refundable)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="e.g. 200 (optional)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Pickup Location */}
          <div className="form-group">
            <label>Pickup & Return Location on Campus</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. SRM Central Library, Tech Park 2nd Floor, or Boys Hostel Block 2"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Item Description</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Provide details about the item's specifications, included accessories (cables, covers), and condition notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Rental Rules */}
          <div className="form-group">
            <label>Rental Rules / Care Instructions (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Return in clean condition; avoid water exposure; return by 6 PM on the end date."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div style={{ marginTop: 28 }}>
            <button
              type="submit"
              className="bb-btn-coral"
              style={{ width: "100%", padding: 14, fontSize: 15 }}
              disabled={loading}
            >
              <PlusCircle size={18} />
              <span>{loading ? "Uploading & Submitting..." : "Submit Listing for Review"}</span>
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
              Listing will be reviewed by admin before appearing in the public marketplace.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
