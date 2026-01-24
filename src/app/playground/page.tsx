'use client';

import Link from 'next/link';

export default function Playground() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      gap: '48px'
    }}>
      <h1 style={{
        fontSize: '48px',
        lineHeight: '48px',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: '#000',
        textAlign: 'center'
      }}>
        Playground
      </h1>

      <div style={{
        display: 'flex',
        gap: '24px',
        maxWidth: '800px',
        width: '100%',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <Link href="/playground/stats" style={{ textDecoration: 'none', flex: '1', minWidth: '280px', maxWidth: '380px' }}>
          <div className="card" style={{
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h2 style={{
              fontSize: '24px',
              lineHeight: '28px',
              fontWeight: 700,
              color: '#000',
              margin: 0
            }}>
              Stats
            </h2>
            <p style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: 'rgba(0, 0, 0, 0.6)',
              margin: 0
            }}>
              View statistics and analytics
            </p>
          </div>
        </Link>

        <Link href="/playground/lottie" style={{ textDecoration: 'none', flex: '1', minWidth: '280px', maxWidth: '380px' }}>
          <div className="card" style={{
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h2 style={{
              fontSize: '24px',
              lineHeight: '28px',
              fontWeight: 700,
              color: '#000',
              margin: 0
            }}>
              Lottie
            </h2>
            <p style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: 'rgba(0, 0, 0, 0.6)',
              margin: 0
            }}>
              Explore Lottie animations
            </p>
          </div>
        </Link>

        <Link href="/playground/antipdf" style={{ textDecoration: 'none', flex: '1', minWidth: '280px', maxWidth: '380px' }}>
          <div className="card" style={{
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h2 style={{
              fontSize: '24px',
              lineHeight: '28px',
              fontWeight: 700,
              color: '#000',
              margin: 0
            }}>
              AntiPDF
            </h2>
            <p style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: 'rgba(0, 0, 0, 0.6)',
              margin: 0
            }}>
              Fill forms & add signatures
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

