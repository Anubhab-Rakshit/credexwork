import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          background: 'linear-gradient(135deg, #fff7ed 0%, #fff 40%, #ecfeff 100%)',
          color: '#1f2937',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '999px',
              background: '#e36b3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '28px',
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: '22px', letterSpacing: '0.3em', color: '#6b7280' }}>
            SPENDLENS
          </div>
        </div>
        <div style={{ marginTop: '32px', fontSize: '64px', fontWeight: 700, lineHeight: 1.05 }}>
          AI Spend Audit
          <br />
          for modern teams
        </div>
        <div style={{ marginTop: '24px', fontSize: '28px', color: '#475569', maxWidth: '900px' }}>
          Uncover plan mismatches, reduce overspend, and share a clean report in minutes.
        </div>
        <div style={{ marginTop: '40px', fontSize: '22px', color: '#0f172a' }}>
          spendlens.io
        </div>
      </div>
    ),
    size
  );
}
