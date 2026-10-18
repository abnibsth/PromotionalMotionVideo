const FILES = [
  { href: '/bpg/bpg-motion-master.mp4', label: 'Master · 30 dtk' },
  { href: '/bpg/bpg-motion-web.mp4', label: 'Web · 30 dtk' },
  { href: '/bpg/bpg-motion-preview.mp4', label: 'Preview · 8 dtk' },
  { href: '/bpg/bpg-motion-contact-sheet.png', label: 'Contact sheet' },
]

export default function App() {
  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#202331] flex flex-col items-center justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <p className="font-mono text-xs tracking-[0.25em] text-[#8E6A2D]">BINTANG PITU GLOBAL</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Everything Connected</h1>
      </header>
      <video
        className="w-full max-w-5xl aspect-video rounded-2xl shadow-2xl ring-1 ring-[#E8E1D3] bg-white"
        src="/bpg/bpg-motion-web.mp4"
        controls
        playsInline
      />
      <nav className="flex flex-wrap justify-center gap-3">
        {FILES.map((f) => (
          <a
            key={f.href}
            href={f.href}
            download
            className="rounded-full border border-[#E2D3B3] bg-white px-5 py-2 text-sm text-[#8E6A2D] hover:bg-[#F3EEE4]"
          >
            {f.label}
          </a>
        ))}
      </nav>
      <img src="/bpg/bpg-motion-contact-sheet.png" alt="Contact sheet" className="w-full max-w-5xl rounded-2xl ring-1 ring-[#E8E1D3]" />
    </main>
  )
}
