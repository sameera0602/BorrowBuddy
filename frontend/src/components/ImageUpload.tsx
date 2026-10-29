import React, { useState } from "react";
import { UploadCloud, X } from "lucide-react";

interface ImageUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ files, onChange, maxFiles = 5 }: ImageUploadProps) {
  const [error, setError] = useState<string>("");

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    validateAndAddFiles(newFiles);
    e.target.value = ""; // Reset input
  }

  function validateAndAddFiles(incoming: File[]) {
    if (files.length + incoming.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} photos.`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        setError("Only JPEG, PNG, and WEBP image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 5MB file size limit.`);
        return;
      }
      validFiles.push(file);
    }

    onChange([...files, ...validFiles]);
  }

  function handleRemove(index: number) {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
    setError("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Upload Drop Area */}
      <label
        style={{
          border: "2px dashed var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 16px",
          textAlign: "center",
          cursor: files.length >= maxFiles ? "not-allowed" : "pointer",
          background: "var(--bg-canvas)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.2s ease"
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={files.length >= maxFiles}
          onChange={handleFileSelection}
          style={{ display: "none" }}
        />
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--primary-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)"
          }}
        >
          <UploadCloud size={24} />
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "var(--primary)" }}>Click or drag photos</span>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            JPEG, PNG or WEBP (Max 5MB each, up to {maxFiles} images)
          </p>
        </div>
      </label>

      {/* Error alert */}
      {error && (
        <div style={{ padding: "8px 12px", background: "var(--accent-coral-light)", color: "var(--accent-coral-text)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
          {files.map((file, idx) => {
            const previewUrl = URL.createObjectURL(file);
            return (
              <div
                key={idx}
                style={{
                  position: "relative",
                  width: "100%",
                  paddingTop: "100%",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                <img
                  src={previewUrl}
                  alt={`preview ${idx}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(19, 34, 56, 0.75)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}
                  title="Remove image"
                >
                  <X size={13} />
                </button>
                {idx === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(19, 34, 56, 0.8)",
                      color: "#fff"
                    }}
                  >
                    Cover
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
