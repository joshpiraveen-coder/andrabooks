import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { BookOpen, Megaphone, Minus, Pin, Search, ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import type { MascotMessageKey, Product } from '../../types';
import { BookCover } from './BookCover';

type Mood = 'idle' | 'wave' | 'peek' | 'celebrate' | 'love' | 'juggle' | 'detective' | 'point' | 'starry' | 'puppy' | 'broadcast' | 'approve' | 'paint';

const promptActions = [
  { label: '🐢  Show Tamil Story Books', to: '/shop?category=Story%20Books&language=Tamil' },
  { label: '📘  English Workbooks (Grade 1–8)', to: '/shop?category=English%20Language&maxPrice=900' },
  { label: '🎨  Coloring Books Under Rs.350', to: '/shop?category=Coloring%20Book&maxPrice=350' },
  { label: '📖  Dictionaries for Kids', to: '/product/andra-dictionary' },
];

const moodMessage = (kind: string, productName?: string, price?: number) => {
  if (kind === 'peek') return `Ooh! Look inside “${productName || 'this book'}”${price ? ` — only Rs.${price.toFixed(2)}` : ''}!`;
  if (kind === 'cart') return `Awesome pick! “${productName || 'Your book'}” is in your bag! 🎉`;
  if (kind === 'wishlist') return 'Saved to your favorites! ♥';
  if (kind === 'compare') return 'Let’s compare those books!';
  if (kind === 'search') return 'Tell me what you’re looking for!';
  if (kind === 'filter') return 'Good choice! Let’s narrow down the shelf.';
  return '';
};

export function AndraMascot() {
  const { settings } = useStore();
  return settings.mascot.enabled ? <AndraMascotActive/> : null;
}

function AndraMascotActive() {
  const { products, addToCart, settings, mascotSignal, notifyMascot } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const rawX = useMotionValue(18);
  const rawY = useMotionValue(typeof window === 'undefined' ? 700 : window.innerHeight - 108);
  const x = useSpring(rawX, { stiffness: 100, damping: 19, mass: 0.8 });
  const y = useSpring(rawY, { stiffness: 100, damping: 19, mass: 0.8 });
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);
  const [activeAnchorKey, setActiveAnchorKey] = useState<MascotMessageKey | null>(null);
  const [signalCoords, setSignalCoords] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [dockOverride, setDockOverride] = useState<boolean | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState({ left: 12, top: 12, width: 320 });
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('right');
  const [query, setQuery] = useState('');
  const [muted, setMuted] = useState(() => localStorage.getItem('andra:mascot-muted') === 'true');
  const [bubble, setBubble] = useState(settings.mascot.messages.hero);
  const [mood, setMood] = useState<Mood>('wave');
  const [eyes, setEyes] = useState({ x: 0, y: 0 });
  const [reactionActive, setReactionActive] = useState(false);
  const docked = isMobile || (dockOverride ?? settings.mascot.defaultMode === 'dock');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter(product => `${product.name} ${product.category} ${product.language} ${product.grade || ''}`.toLowerCase().includes(q)).slice(0, 3) : [];
  }, [products, query]);

  const setTarget = useCallback((targetX: number, targetY: number) => {
    if (typeof window === 'undefined') return;
    const mascotSize = isMobile ? 52 : 92;
    const xPosition = Math.max(8, Math.min(window.innerWidth - mascotSize, targetX));
    setBubbleSide(xPosition > window.innerWidth * 0.53 ? 'left' : 'right');
    rawX.set(xPosition);
    const headerSafeTop = !isMobile && window.scrollY < 120 ? Math.min(350, Math.max(8, window.innerHeight - mascotSize)) : 8;
    rawY.set(Math.max(headerSafeTop, Math.min(window.innerHeight - mascotSize, targetY)));
  }, [isMobile, rawX, rawY]);

  const updateAnchor = useCallback(() => {
    if (typeof window === 'undefined') return;
    const centerLine = window.innerHeight * 0.34;
    const candidates = [...document.querySelectorAll<HTMLElement>('[data-mascot-anchor]')]
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(item => item.rect.bottom > 10 && item.rect.top < window.innerHeight - 30)
      .sort((a, b) => Math.abs((a.rect.top + a.rect.height / 2) - centerLine) - Math.abs((b.rect.top + b.rect.height / 2) - centerLine));
    const target = candidates[0]?.element || null;
    const key = target?.dataset.mascotAnchor as MascotMessageKey | undefined;
    setActiveAnchor(current => current === target ? current : target);
    setActiveAnchorKey(current => current === (key || null) ? current : key || null);
  }, []);

  const positionAtAnchor = useCallback((anchor: HTMLElement | null) => {
    if (isMobile) { setTarget(16, window.innerHeight - 64); return; }
    if (docked) { setTarget(18, window.innerHeight - 112); return; }
    if (signalCoords) { setTarget(signalCoords.x, signalCoords.y); return; }
    if (!anchor) { setTarget(18, window.innerHeight - 112); return; }
    const rect = anchor.getBoundingClientRect();
    const key = anchor.dataset.mascotAnchor;
    let nextX = rect.right + 10;
    let nextY = rect.top - 58;
    if (key === 'hero') {
      const banner = document.querySelector<HTMLElement>('.hero-banner')?.getBoundingClientRect();
      nextX = (banner?.left || 0) + Math.max(22, (window.innerWidth - 1200) / 2 + 24);
      nextY = (banner?.bottom || rect.bottom) - 112;
    }
    if (key === 'arrivals') { nextX = rect.right - 92; nextY = rect.top - 78; }
    if (key === 'promo') { nextX = rect.left + rect.width * 0.56 - 45; nextY = rect.top - 93; }
    if (key === 'language') { nextX = rect.left - 76; nextY = rect.top - 70; }
    if (key === 'testimonials') { nextX = rect.right - 95; nextY = rect.top - 76; }
    if (key === 'shop') { nextX = rect.right + 6; nextY = rect.top - 62; }
    if (key === 'product') { nextX = rect.right - 75; nextY = rect.top - 96; }
    if (key === 'cart') { nextX = rect.left + rect.width / 2 - 44; nextY = rect.top - 76; }
    setTarget(nextX, nextY);
  }, [docked, isMobile, signalCoords, setTarget]);

  const positionAssistant = useCallback(() => {
    if (typeof window === 'undefined') return;
    const width = Math.max(180, Math.min(isMobile ? 360 : 320, window.innerWidth - (isMobile ? 32 : 24)));
    const height = Math.min(570, window.innerHeight * .72);
    let left = 12;
    if (isMobile) left = 16;
    else if (!docked) {
      const rightPosition = x.get() + 104;
      left = rightPosition + width <= window.innerWidth - 12 ? rightPosition : Math.max(12, x.get() - width - 12);
    }
    const desiredTop = isMobile ? window.innerHeight - height - 80 : docked ? window.innerHeight - height - 12 : y.get() - height + 92;
    const top = Math.max(12, Math.min(window.innerHeight - height - (isMobile ? 80 : 12), desiredTop));
    setAssistantPosition(current => current.left === left && current.top === top && current.width === width ? current : { left, top, width });
  }, [docked, isMobile, x, y]);

  useMotionValueEvent(scrollY, 'change', () => {
    updateAnchor();
    positionAtAnchor(activeAnchor);
  });
  useMotionValueEvent(x, 'change', () => { if (assistantOpen) positionAssistant(); });
  useMotionValueEvent(y, 'change', () => { if (assistantOpen) positionAssistant(); });

  useEffect(() => { if (assistantOpen) positionAssistant(); }, [assistantOpen, positionAssistant]);

  useEffect(() => {
    setBubbleVisible(true);
    const timer = window.setTimeout(() => setBubbleVisible(false), isMobile ? 3000 : 4000);
    return () => window.clearTimeout(timer);
  }, [bubble, isMobile, mascotSignal?.token, activeAnchorKey]);

  useEffect(() => {
    updateAnchor();
    const timer = window.setTimeout(updateAnchor, 220);
    const media = window.matchMedia('(max-width: 767px)');
    const onMediaChange = () => setIsMobile(media.matches);
    const onResize = () => { updateAnchor(); positionAtAnchor(activeAnchor); positionAssistant(); };
    window.addEventListener('resize', onResize);
    media.addEventListener('change', onMediaChange);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', onResize); media.removeEventListener('change', onMediaChange); };
  }, [location.pathname, updateAnchor, positionAtAnchor, positionAssistant, activeAnchor]);

  useEffect(() => { positionAtAnchor(activeAnchor); }, [activeAnchor, positionAtAnchor]);

  useEffect(() => {
    if (reactionActive) return;
    setBubble(activeAnchorKey ? settings.mascot.messages[activeAnchorKey] : settings.mascot.messages.hero);
    if (activeAnchorKey === 'shop') setMood('detective');
    else if (activeAnchorKey === 'testimonials') setMood('starry');
    else if (activeAnchorKey === 'promo') setMood('paint');
    else if (activeAnchorKey === 'cart') setMood('puppy');
    else if (activeAnchorKey === 'arrivals' || activeAnchorKey === 'language' || activeAnchorKey === 'product') setMood('point');
    else setMood('wave');
  }, [activeAnchorKey, settings.mascot.messages, reactionActive]);

  useEffect(() => {
    if (!mascotSignal) return;
    const event = mascotSignal;
    setReactionActive(true);
    const text = event.text || moodMessage(event.kind, event.productName, event.price);
    const nextMood: Mood = event.kind === 'cart' ? 'celebrate' : event.kind === 'wishlist' ? 'love' : event.kind === 'compare' ? 'juggle' : event.kind === 'search' ? 'detective' : event.kind === 'peek' ? 'peek' : event.kind === 'broadcast' ? 'broadcast' : event.kind === 'filter' ? 'approve' : 'point';
    setMood(nextMood);
    if (text) setBubble(text);
    setSignalCoords(event.coords || null);
    const timer = window.setTimeout(() => {
      setMood('idle');
      setSignalCoords(null);
      setReactionActive(false);
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [mascotSignal?.token]);

  useEffect(() => {
    if (!settings.mascot.enabled || !settings.mascot.broadcast.trim()) return;
    const interval = Math.max(15, settings.mascot.broadcastIntervalSeconds || 45) * 1000;
    const timer = window.setInterval(() => notifyMascot({ kind: 'broadcast', text: settings.mascot.broadcast }), interval);
    return () => window.clearInterval(timer);
  }, [settings.mascot.enabled, settings.mascot.broadcast, settings.mascot.broadcastIntervalSeconds, notifyMascot]);

  useEffect(() => {
    const trackEyes = (event: MouseEvent) => {
      const centerX = rawX.get() + 45;
      const centerY = rawY.get() + 45;
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      setEyes({ x: Math.cos(angle) * 4.5, y: Math.sin(angle) * 4.5 });
    };
    window.addEventListener('mousemove', trackEyes, { passive: true });
    return () => window.removeEventListener('mousemove', trackEyes);
  }, [rawX, rawY]);

  const toggleDock = () => setDockOverride(!docked);
  const toggleMute = () => setMuted(value => { localStorage.setItem('andra:mascot-muted', String(!value)); return !value; });
  const toggleAssistant = () => { setBubbleVisible(true); setAssistantOpen(value => !value); };
  const pickPrompt = (to: string) => { navigate(to); setAssistantOpen(false); setMood('point'); };
  const moodMotion = prefersReducedMotion ? {} : mood === 'celebrate' ? { rotate: [0, -12, 360], scale: [1, 1.15, 1] } : mood === 'juggle' ? { rotate: [0, -9, 9, 0], y: [0, -4, 0] } : mood === 'peek' ? { rotate: [0, -7, -4, 0], y: [0, -3, 0] } : mood === 'approve' ? { rotate: [0, 0, 0], y: [0, 3, 0] } : { rotate: [-2, 2, -2], y: [0, -5, 0] };

  return <>
  <motion.div className={`andra-mascot-position ${docked ? 'is-docked' : 'is-roaming'}`} style={{ x, y }} layout>
    <div className="andra-mascot-stage">
      {!muted && bubble && bubbleVisible && <AnimatePresence><motion.div key={bubble} className={`andra-mascot-bubble bubble-${bubbleSide}`} initial={{ opacity: 0, y: 8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5 }} layout>{bubble}</motion.div></AnimatePresence>}
      <motion.div className={`andra-mascot-character mood-${mood}`} animate={moodMotion} transition={prefersReducedMotion ? { duration: 0 } : mood === 'celebrate' ? { duration: 1, repeat: 1, ease: 'easeInOut' } : mood === 'approve' ? { duration: .55, repeat: 2, ease: 'easeOut' } : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
        <button className="andra-mascot-face" aria-label="Ask Andra Buddy for book suggestions" aria-expanded={assistantOpen} onClick={toggleAssistant}>
          <svg viewBox="0 0 112 112" role="img" aria-label="Andra Buddy, the Andra Books reading mascot">
            <defs><linearGradient id="buddy-book" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f00078"/><stop offset="1" stopColor="#b90057"/></linearGradient><filter id="buddy-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#4b0930" floodOpacity=".22"/></filter></defs>
            <motion.path className="buddy-wing buddy-wing-left" d="M45 73Q23 47 7 39Q10 57 16 74Q24 88 47 92Z" fill="#fff" stroke="#ded7de" strokeWidth="2" animate={prefersReducedMotion ? { rotate: 0 } : mood === 'idle' || mood === 'wave' ? { rotate: [0, -8, 0] } : { rotate: [0, -14, 0] }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .8, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '47px 78px' }}/>
            <motion.path className="buddy-wing buddy-wing-right" d="M67 73Q89 47 105 39Q102 57 96 74Q88 88 65 92Z" fill="#fff" stroke="#ded7de" strokeWidth="2" animate={prefersReducedMotion ? { rotate: 0 } : mood === 'idle' || mood === 'wave' ? { rotate: [0, 8, 0] } : { rotate: [0, 14, 0] }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .8, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '65px 78px' }}/>
            <g filter="url(#buddy-shadow)"><path d="M10 70Q31 63 56 77Q81 63 102 70V101Q79 93 56 106Q32 93 10 101Z" fill="url(#buddy-book)"/><path d="M17 75Q36 69 55 81V98Q35 88 17 95Z" fill="#fff"/><path d="M58 81Q78 69 96 75V95Q76 88 58 98Z" fill="#fff"/><path d="M56 78V104" stroke="#95114f" strokeWidth="2"/><path d="M23 82q13-5 24 1M23 88q12-4 23 1M65 83q11-6 23-2M65 89q10-5 22-1" fill="none" stroke="#ed9bc0" strokeWidth="1.5" strokeLinecap="round"/></g>
            <path d="M24 47Q25 20 56 19Q87 20 88 47V61Q85 77 56 80Q27 77 24 61Z" fill="#f7c9b9" stroke="#a34a65" strokeWidth="1.5"/>
            <path d="M28 34Q33 13 56 15Q78 14 85 34Q70 28 56 28Q42 28 28 34Z" fill="#563248"/>
            <path d="M31 38q8-8 18-3M64 35q9-5 17 3" fill="none" stroke="#392331" strokeWidth="3" strokeLinecap="round"/>
            <motion.g className="buddy-eyes" animate={prefersReducedMotion ? { scaleY: 1 } : { scaleY: [1, 1, .08, 1] }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .22, repeat: Infinity, repeatDelay: 3.25 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <ellipse cx="43" cy="50" rx="20" ry="17" fill="#111"/><ellipse cx="69" cy="50" rx="20" ry="17" fill="#111"/>
              <ellipse cx="43" cy="50" rx={mood === 'puppy' ? 18 : 16.7} ry={mood === 'puppy' ? 15 : 13.8} fill="#fff"/><ellipse cx="69" cy="50" rx={mood === 'puppy' ? 18 : 16.7} ry={mood === 'puppy' ? 15 : 13.8} fill="#fff"/>
              <circle cx={43 + eyes.x} cy={50 + eyes.y} r="7.4" fill={mood === 'love' ? '#df0067' : '#17151a'}/><circle cx={69 + eyes.x} cy={50 + eyes.y} r="7.4" fill={mood === 'love' ? '#df0067' : '#17151a'}/>
              <circle cx={40 + eyes.x} cy={47 + eyes.y} r="2.4" fill="#fff"/><circle cx={66 + eyes.x} cy={47 + eyes.y} r="2.4" fill="#fff"/>
              <path d="M53 50q3-4 6 0" fill="none" stroke="#111" strokeWidth="3"/>
            </motion.g>
            <path d="M49 66q7 7 14 0" fill="none" stroke="#8f354d" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="26" cy="61" r="4" fill="#f18c98"/><circle cx="86" cy="61" r="4" fill="#f18c98"/>
            <path d="M11 78Q3 74 5 68M101 78Q109 74 107 68" fill="none" stroke="#f7c9b9" strokeWidth="5" strokeLinecap="round"/>
            {mood === 'love' && <g fill="#df0067"><path d="M39 48c-4-5-11 1 0 9 11-8 4-14 0-9Z"/><path d="M67 48c-4-5-11 1 0 9 11-8 4-14 0-9Z"/></g>}
            {mood === 'peek' && <path d="M81 41q1-9 6-8 4 1 1 5l-2 6" fill="#f7c9b9" stroke="#a34a65" strokeWidth="1.5" strokeLinecap="round"/>}
            {mood === 'puppy' && <path d="M31 37q7-6 14-2M68 35q7-4 13 2" fill="none" stroke="#392331" strokeWidth="2.5" strokeLinecap="round"/>}
            {(mood === 'point' || mood === 'puppy') && <path d="M100 79q7-2 7-10l-2-9m2 9 4-5" fill="none" stroke="#f7c9b9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}
            {(mood === 'love' || mood === 'starry') && <g className="buddy-sparkle-eyes"><path d="m25 16 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="#ffc83d"/><path d="m87 13 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="#ffc83d"/></g>}
            {mood === 'detective' && <g className="buddy-magnifier"><circle cx="91" cy="49" r="12" fill="#ffffff9c" stroke="#777" strokeWidth="3"/><path d="m99 58 8 9" stroke="#777" strokeWidth="4" strokeLinecap="round"/></g>}
            {mood === 'paint' && <g className="buddy-paintbrush"><path d="m88 14 8 8-16 16-8-8z" fill="#ffd04d" stroke="#70465c" strokeWidth="2"/><path d="m72 30-5 9 11-1" fill="#f18c98" stroke="#70465c" strokeWidth="2"/><path d="m91 17 4-4" stroke="#df0067" strokeWidth="3" strokeLinecap="round"/></g>}
            {mood === 'broadcast' && <Megaphone className="buddy-megaphone" x="80" y="5" width="25" height="25" color="#df0067"/>}
          </svg>
          {mood === 'celebrate' && <span className="buddy-particles" aria-hidden="true"><i>★</i><i>✦</i><i>★</i><i>✦</i></span>}
        </button>
      </motion.div>
      <button className="andra-mascot-pin" onClick={event => { event.stopPropagation(); toggleDock(); }} aria-label={docked ? 'Let Andra Buddy roam' : 'Dock Andra Buddy'} title={docked ? 'Free roam' : 'Dock mascot'}>{docked ? '🪽' : <Pin size={13}/>}</button>
    </div>
  </motion.div>
  {typeof document !== 'undefined' && createPortal(<AnimatePresence>{assistantOpen && <motion.section className={`andra-assistant-panel ${isMobile ? 'mobile-sheet' : ''}`} style={{ position: 'fixed', left: assistantPosition.left, top: assistantPosition.top, right: 'auto', bottom: 'auto', width: assistantPosition.width }} initial={{ opacity: 0, scale: .95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: 8 }} aria-label="Ask Andra Buddy book finder">
    <header><strong><BookOpen size={16}/> Andra Buddy <small>Book Helper</small></strong><div>{!isMobile && <button onClick={toggleDock} aria-label={docked ? 'Free roam' : 'Dock'} title={docked ? 'Free roam' : 'Dock'}>{docked ? '🪽' : <Pin size={14}/>}</button>}<button onClick={toggleMute} aria-label={muted ? 'Unmute speech bubbles' : 'Mute speech bubbles'}>{muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button><button onClick={() => setAssistantOpen(false)} aria-label="Minimize helper"><Minus size={16}/></button></div></header>
    <div className="andra-assistant-content"><p className="assistant-intro">Need help finding a story? Pick a shelf or search our books.</p><div className="assistant-prompts">{promptActions.map(action => <button key={action.to} onClick={() => pickPrompt(action.to)}>{action.label}</button>)}</div><label className="assistant-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Lion, Grade 3, Sinhala…"/></label>{query && <div className="assistant-results">{results.length ? results.map(product => <AssistantBook key={product.id} product={product} onAdd={() => addToCart(product.id)} onOpen={() => { setAssistantOpen(false); navigate(`/product/${product.slug || product.id}`); }}/>) : <p>No matching books yet. Try another title or language.</p>}</div>}<small className="assistant-footer">Andra Books · Growing minds, page by page</small></div>
  </motion.section>}</AnimatePresence>, document.body)}
  </>;
}

function AssistantBook({ product, onAdd, onOpen }: { product: Product; onAdd: () => void; onOpen: () => void }) {
  return <article className="assistant-book"><button className="assistant-book-cover" onClick={onOpen} aria-label={`View ${product.name}`}><BookCover product={product}/></button><div><button className="assistant-book-title" onClick={onOpen}>{product.name}</button><small>{product.category}</small><strong>Rs.{product.price.toFixed(2)}</strong><button className="assistant-add" disabled={!product.stock} onClick={onAdd}><ShoppingBag size={12}/> + Cart</button></div></article>;
}
