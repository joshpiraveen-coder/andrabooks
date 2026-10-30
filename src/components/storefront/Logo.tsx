import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const { settings } = useStore();
  return <Link to="/" className={`brand-logo ${light ? 'brand-logo-light' : ''} ${compact ? 'brand-logo-compact' : ''}`} aria-label="Andra Books home">
    {settings.logoUrl && !light ? <img className="brand-logo-image" src={settings.logoUrl} alt="Andra Books" /> : <svg className="brand-logo-art" viewBox="0 0 250 100" role="img" aria-label="Andra Books">
      <text className="brand-logo-andra" x="128" y="31" textAnchor="middle">ANDRA</text>
      <text className="brand-logo-book-letter" x="23" y="91">B</text>
      <text className="brand-logo-book-letters" x="175" y="91">KS</text>
      <g className="brand-logo-glasses">
        <ellipse cx="105" cy="70" rx="26" ry="20" />
        <ellipse cx="151" cy="70" rx="26" ry="20" />
        <path d="M131 69q-3-8-7 0" />
        <circle cx="105" cy="65" r="8" />
        <circle cx="151" cy="65" r="8" />
        <circle cx="107" cy="63" r="2.5" />
        <circle cx="153" cy="63" r="2.5" />
      </g>
    </svg>}
  </Link>;
}
