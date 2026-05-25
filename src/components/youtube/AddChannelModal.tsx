"use client";

import { useState, FormEvent, useRef, useEffect } from "react";

interface AddChannelModalProps {
  onClose:  () => void;
  onAdded:  () => void;
}

export function AddChannelModal({ onClose, onAdded }: AddChannelModalProps) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/youtube/accounts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: input.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add channel.");
      } else {
        onAdded();
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-warm-card border border-warm-border rounded-2xl shadow-card-md w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-border">
          <h2 className="text-lg font-semibold text-ink">Add YouTube Channel</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-warm-hover transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="channel-input" className="block text-sm font-medium text-ink mb-1.5">
              Channel URL, ID, or handle
            </label>
            <input
              ref={inputRef}
              id="channel-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. @MrBeast or https://youtube.com/@MrBeast"
              className="w-full rounded-xl border border-warm-border bg-warm-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/20 outline-none transition"
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              Supports: channel URL, @handle, or UC… channel ID
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-warm-border text-ink-secondary text-sm font-medium py-2.5 hover:bg-warm-hover transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-1 rounded-xl bg-pink-primary hover:bg-pink-hover text-white text-sm font-semibold py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Adding…" : "Add Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
