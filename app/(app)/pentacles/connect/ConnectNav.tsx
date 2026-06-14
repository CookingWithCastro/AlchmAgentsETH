'use client'

import Link from 'next/link'

const linkStyle: React.CSSProperties = {
  color: '#9aa0d8',
  fontWeight: 500,
  textDecoration: 'none',
  fontSize: 14,
  transition: 'color 0.2s',
}

/** Sub-navigation for the Arc onboarding page. Client component so the hover
 * handlers are legal (a Server Component may not pass event handlers to props). */
export default function ConnectNav() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        borderBottom: '1px solid rgba(122, 128, 200, 0.2)',
        paddingBottom: 10,
        width: '100%',
      }}
    >
      <Link
        href="/pentacles"
        style={linkStyle}
        onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
      >
        Sky Vaults
      </Link>
      <Link
        href="/pentacles/portfolio"
        style={linkStyle}
        onMouseEnter={e => (e.currentTarget.style.color = '#e7e9ff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9aa0d8')}
      >
        Your Portfolio
      </Link>
      <span style={{ color: '#ffd76a', fontWeight: 600, fontSize: 14 }}>Arc Onboarding</span>
    </div>
  )
}
