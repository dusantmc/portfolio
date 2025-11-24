'use client';

import Link from 'next/link';

export default function Lottie() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      gap: '24px'
    }}>
      <Link href="/playground" style={{
        position: 'absolute',
        top: '40px',
        left: '40px',
        fontSize: '14px',
        color: 'rgba(0, 0, 0, 0.6)',
        textDecoration: 'none',
        transition: 'color 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0, 0, 0, 0.6)'}
      >
        ← Back to Playground
      </Link>
      
      <h1 style={{
        fontSize: '48px',
        lineHeight: '48px',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: '#000',
        textAlign: 'center'
      }}>
        Lottie
      </h1>
      
      <p style={{
        fontSize: '18px',
        lineHeight: '24px',
        color: 'rgba(0, 0, 0, 0.6)',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Lottie page coming soon...
      </p>
    </div>
  );
}

