import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Rendered at build time via Satori (flexbox-only CSS) — no external design
// asset needed. English-only text: Satori has no bundled Devanagari glyphs,
// and a single OG image shared across locales is standard practice anyway.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #0B2F4F 0%, #0a2742 60%, #081f36 100%)',
          fontFamily: '"Segoe UI", Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -100,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -140,
            left: -90,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(249,115,22,0.18)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 88px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                width: 64,
                height: 64,
                borderRadius: 18,
                background: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 512 512" fill="none">
                <path d="M112 314V189C112 168.013 129.013 151 150 151H238V365C214.789 340.805 181.734 327 147 327H125C117.82 327 112 321.18 112 314Z" fill="#0B2F4F" />
                <path d="M400 314V189C400 168.013 382.987 151 362 151H274V365C297.211 340.805 330.266 327 365 327H387C394.18 327 400 321.18 400 314Z" fill="#9fd9cd" />
                <path d="M201 273L257 217L298 258L371 185" stroke="#F97316" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 40, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5 }}>RajyaRank</span>
          </div>

          <div style={{ fontSize: 56, fontWeight: 800, color: '#ffffff', marginTop: 44, lineHeight: 1.15, maxWidth: 920 }}>
            Government exam prep for students All Over India
          </div>
          <div style={{ fontSize: 28, color: '#c8dae8', marginTop: 20, maxWidth: 820 }}>
            Video classes, notes, mock tests, daily current affairs &amp; a personalised study plan
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
            {['BPSC', 'SSC', 'Railways', 'Police'].map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  padding: '10px 22px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#e8f0f6',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
