import { ImageResponse } from 'next/og';
import { formatCurrency } from '@/lib/utils';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function getShareData(id: string) {
  const res = await fetch(`${appUrl}/api/share/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function OpenGraphImage({ params }: { params: { id: string } }) {
  const data = await getShareData(params.id);
  const monthly = data?.totalMonthlySavings ?? 0;
  const tools = data?.auditResults?.toolResults?.length ?? 0;

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
        <div style={{ marginTop: '32px', fontSize: '56px', fontWeight: 700, lineHeight: 1.05 }}>
          Audit report
        </div>
        <div style={{ marginTop: '16px', fontSize: '34px', color: '#0f172a' }}>
          {formatCurrency(monthly)} / month saved
        </div>
        <div style={{ marginTop: '16px', fontSize: '22px', color: '#475569' }}>
          {tools} tools analyzed • Public share link
        </div>
        <div style={{ marginTop: '40px', fontSize: '22px', color: '#0f172a' }}>
          spendlens.io
        </div>
      </div>
    ),
    size
  );
}
