'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const [utente, setUtente] = useState<any>(null)

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setUtente(data.user))
  supabase.auth.onAuthStateChange((_, session) => setUtente(session?.user ?? null))
}, [])
  const pathname = usePathname()
  const [menuAperto, setMenuAperto] = useState(false)

  const links = [
    { href: '/', label: '🏠 Home' },
    { href: '/cerca', label: '🔍 Cerca' },
    { href: '/volantini', label: '📄 Volantini' },
    { href: '/supermercati', label: '🏪 Supermercati' },
    { href: '/lista-spesa', label: '🛒 Lista spesa' },
  ]

  const isAttivo = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e8e6de',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
      }}>

        {/* LOGO */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '36px', height: '36px', background: '#1a7a4a',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', flexShrink: 0
          }}>🛒</div>
          <span style={{ fontWeight: '800', fontSize: '1.3rem', color: '#1a7a4a' }}>
            SpesaSmart
          </span>
        </Link>

        {/* LINKS DESKTOP */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px'
        }} className="nav-desktop">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: isAttivo(link.href) ? '600' : '500',
                color: isAttivo(link.href) ? '#1a7a4a' : '#5a5a52',
                background: isAttivo(link.href) ? '#e8f5ee' : 'transparent',
                transition: 'all 0.15s'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* DESTRA: Admin + Accedi + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {utente ? (
  <Link href="/account" style={{ background: '#1a7a4a', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>
    👤 {utente.user_metadata?.nome || 'Account'}
  </Link>
) : (
  <Link href="/login" style={{ background: '#1a7a4a', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>
    Accedi
  </Link>
)}

          {/* HAMBURGER mobile */}
          <button
            onClick={() => setMenuAperto(!menuAperto)}
            style={{
              background: 'none', border: '1px solid #e8e6de',
              borderRadius: '8px', padding: '8px', cursor: 'pointer',
              display: 'none', flexDirection: 'column', gap: '4px',
              width: '38px', height: '38px', alignItems: 'center', justifyContent: 'center'
            }}
            className="hamburger"
            aria-label="Menu"
          >
            <span style={{ width: '16px', height: '2px', background: '#1a1a18', borderRadius: '2px', display: 'block', transition: 'all 0.2s', transform: menuAperto ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <span style={{ width: '16px', height: '2px', background: '#1a1a18', borderRadius: '2px', display: 'block', transition: 'all 0.2s', opacity: menuAperto ? 0 : 1 }} />
            <span style={{ width: '16px', height: '2px', background: '#1a1a18', borderRadius: '2px', display: 'block', transition: 'all 0.2s', transform: menuAperto ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* MENU MOBILE */}
      {menuAperto && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0,
          background: 'white', borderBottom: '1px solid #e8e6de',
          padding: '12px 16px', zIndex: 99,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }} className="nav-mobile-menu">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuAperto(false)}
              style={{
                display: 'block', padding: '12px 16px',
                borderRadius: '10px', textDecoration: 'none',
                fontSize: '0.95rem', fontWeight: isAttivo(link.href) ? '600' : '400',
                color: isAttivo(link.href) ? '#1a7a4a' : '#1a1a18',
                background: isAttivo(link.href) ? '#e8f5ee' : 'transparent',
                marginBottom: '4px'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  )
}