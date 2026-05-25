export default function TwitterPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink">Twitter / X</h1>
        </div>
        <div className="mt-8 bg-warm-card border border-warm-border rounded-2xl p-12 text-center shadow-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Twitter — coming soon</h2>
          <p className="text-ink-muted text-sm">Twitter/X tracking will be available in a future update.</p>
        </div>
      </div>
    </div>
  );
}
