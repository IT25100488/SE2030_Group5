import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowUpRight, ArrowRight, Search, MapPin, Bed, Bath, Maximize2, Star, ChevronLeft, ChevronRight, Phone, Mail, X, Quote } from 'lucide-react';
import { api } from '../api';
import './GuestHome.css';

/*
 * GuestHome — public landing page for visitors who are not signed in.
 * Layout and motion follow the reference video (pinned hero zoom into a
 * photo-filled wordmark, scroll-filled text, sliding image strips, pinned
 * steps, image-reveal rows, card strip, resources list, curtain footer).
 * Every control calls an existing App handler — no business logic lives here.
 */

const img = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const IMAGES = {
  tower: img('1545324418-cc1a3fa10c00', 2000),
  aerial: img('1512917774080-9991f1c4c750', 2000),
  lounge: img('1600210492486-724fe5c67fb0', 2000),
  strips: ['1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1502672260266-1c1ef2d93688', '1600566753376-12c8ab7fb75b', '1574362848149-11496d93a7c7'].map((id) => img(id, 900)),
  sellTall: img('1600596542815-ffad4c1539a9', 1200),
  sellSmall: img('1600607687920-4e2a09cf159d', 800),
  help: {
    Buy: img('1600585154526-990dced4db0d', 1800),
    Sell: img('1580587771525-78b9dba3b914', 1800),
    Tour: img('1522708323590-d24dbb6b0267', 1800),
    Ask: img('1513694203232-719a280e022f', 1800)
  },
  services: ['1560448204-e02f11c3d0e2', '1600607687644-c7171b42498f', '1567496898669-ee935f5f647a', '1600573472592-401b489a3cdc', '1507089947368-19c1da9775ae'].map((id) => img(id, 900))
};

const CITIES = ['Colombo', 'Rajagiriya', 'Kandy', 'Negombo', 'Bentota', 'Nuwara Eliya', 'Galle', 'Mirissa', 'Mount Lavinia', 'Battaramulla', 'Trincomalee'];
const NAV_HEIGHT = 65;

const GUIDES = [
  {
    id: 'deposit',
    tag: 'Guide',
    title: 'How the reservation deposit works',
    excerpt: 'What you pay to hold an apartment, and when it counts as reserved.',
    body: [
      'Reserving an apartment takes a deposit of 10% of the listed price on the standard plan. Some listings offer a 5% promotional deposit, and you can also choose full settlement, which takes 2% off the price.',
      'Our finance team checks each payment. Once it is verified, the apartment is marked as reserved for you and taken off the market while you complete the purchase.'
    ],
    action: 'browse'
  },
  {
    id: 'refunds',
    tag: 'Guide',
    title: 'Refunds if you change your mind',
    excerpt: 'Full, partial or none — it depends on how many days have passed.',
    body: [
      'Cancel within 2 days of paying and the full deposit comes back.',
      'Between day 3 and day 7, 85% of the deposit is refunded. After 7 days the deposit is non-refundable.',
      'You can preview the exact refund amount in Purchases & Invoices before you confirm a cancellation.'
    ],
    action: 'terms'
  },
  {
    id: 'tours',
    tag: 'Guide',
    title: 'What happens on a private tour',
    excerpt: 'Booking a viewing, meeting the agent, and asking follow-up questions.',
    body: [
      'Pick a date and time on any listing. The listing agent confirms the slot and meets you at the apartment.',
      'After the visit you can send follow-up questions through Customer Inquiries. Tours are open to signed-in buyers.'
    ],
    action: 'tour'
  }
];

const formatLKR = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(n >= 100_000_000 ? 0 : 1)}M`;
  return `LKR ${n.toLocaleString('en-LK')}`;
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const hideBrokenImage = (e) => { e.currentTarget.style.visibility = 'hidden'; };
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- scroll helpers ---------- */

// Runs `onFrame(el, rect, viewportHeight)` on scroll/resize, throttled to animation frames.
function useScrollFrame(ref, onFrame) {
  const cb = useRef(onFrame);
  useEffect(() => { cb.current = onFrame; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let frame = 0;
    const run = () => { frame = 0; cb.current(el, el.getBoundingClientRect(), window.innerHeight || 1); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };
    run();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}

// 0 → 1 while a pinned "track" section scrolls past its sticky child.
const trackProgress = (rect, vh) => {
  const span = rect.height - (vh - NAV_HEIGHT);
  return span > 0 ? clamp01((NAV_HEIGHT - rect.top) / span) : 0;
};
// 0 → 1 while an element travels from `start` to `end` (fractions of viewport height).
const passProgress = (rect, vh, start = 0.9, end = 0.35) => {
  const from = vh * start;
  const to = vh * end - rect.height * 0.5;
  return clamp01((from - rect.top) / (from - to));
};

/* Words fade from grey to ink as the block scrolls into view. */
function ScrollFill({ text, as: Tag = 'p', className = '', start = 0.88, end = 0.42, id }) {
  const ref = useRef(null);
  const words = useMemo(() => text.split(' '), [text]);
  useScrollFrame(ref, (el, rect, vh) => {
    const p = prefersReducedMotion() ? 1 : passProgress(rect, vh, start, end);
    const spans = el.children;
    const lit = Math.round(p * spans.length);
    for (let i = 0; i < spans.length; i += 1) spans[i].classList.toggle('is-lit', i < lit);
  });
  return (
    <Tag ref={ref} id={id} className={`gh-fill ${className}`} aria-label={text}>
      {words.map((w, i) => <span key={i} aria-hidden="true">{w} </span>)}
    </Tag>
  );
}

function RevealImage({ src, alt }) {
  const ref = useRef(null);
  useScrollFrame(ref, (el, rect, vh) => el.style.setProperty('--p', passProgress(rect, vh, 1, 0.55).toFixed(3)));
  return (
    <div ref={ref} className="gh-reveal">
      <img src={src} alt={alt} loading="lazy" onError={hideBrokenImage} />
    </div>
  );
}

/* ---------- 1. Pinned hero: zoom into the building, land on the wordmark ---------- */
function IntroHero({ onSearch }) {
  const ref = useRef(null);
  const [query, setQuery] = useState({ keyword: '', city: '' });
  const [loaded, setLoaded] = useState(false);
  const [copyHidden, setCopyHidden] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useScrollFrame(ref, (el, rect, vh) => {
    const p = prefersReducedMotion() ? 0 : trackProgress(rect, vh);
    el.style.setProperty('--copy', range(p, 0, 0.22).toFixed(3));
    el.style.setProperty('--zoom', range(p, 0.05, 0.6).toFixed(3));
    el.style.setProperty('--cloud', (range(p, 0.3, 0.5) - range(p, 0.62, 0.85) * 0.75).toFixed(3));
    el.style.setProperty('--mark', range(p, 0.48, 0.72).toFixed(3));
    const hidden = p > 0.18;
    setCopyHidden((prev) => (prev === hidden ? prev : hidden));
  });

  const submit = (e) => {
    e.preventDefault();
    onSearch({ keyword: query.keyword.trim(), city: query.city });
  };

  return (
    <section ref={ref} className={`gh-intro ${loaded ? 'is-in' : ''}`} aria-labelledby="gh-hero-title">
      <div className="gh-intro__sticky">
        <div className="gh-intro__sky" aria-hidden="true" />
        <div className="gh-intro__building" aria-hidden="true">
          <img src={IMAGES.tower} alt="" onError={hideBrokenImage} />
        </div>
        <div className="gh-intro__cloud gh-intro__cloud--a" aria-hidden="true" />
        <div className="gh-intro__cloud gh-intro__cloud--b" aria-hidden="true" />

        <div className="gh-intro__copy" aria-hidden={copyHidden} inert={copyHidden || undefined}>
          <h1 id="gh-hero-title" className="gh-intro__title">Find your floor.</h1>
          <form className="gh-search" onSubmit={submit} role="search">
            <label className="gh-search__field">
              <Search size={17} aria-hidden="true" />
              <span className="gh-sr">Keyword</span>
              <input type="text" value={query.keyword} onChange={(e) => setQuery({ ...query, keyword: e.target.value })} placeholder="Penthouse, sea view, pool" />
            </label>
            <label className="gh-search__field gh-search__field--city">
              <MapPin size={17} aria-hidden="true" />
              <span className="gh-sr">City</span>
              <select value={query.city} onChange={(e) => setQuery({ ...query, city: e.target.value })}>
                <option value="">Any city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn--ink">Search apartments</button>
          </form>
        </div>

        <div className="gh-intro__mark" aria-hidden="true">
          <span className="gh-intro__word" style={{ backgroundImage: `url(${IMAGES.tower}), linear-gradient(180deg, #1e3e62, #0b192c)` }}>FLOW</span>
          <span className="gh-intro__tag">Property Flow · Sri Lanka</span>
        </div>
        <span className="gh-intro__hint" aria-hidden="true">Scroll</span>
      </div>
    </section>
  );
}

/* ---------- 3. Sliding chevron image strips ---------- */
function StripSection({ images }) {
  const ref = useRef(null);
  useScrollFrame(ref, (el, rect, vh) => el.style.setProperty('--p', (prefersReducedMotion() ? 1 : passProgress(rect, vh, 1, 0.3)).toFixed(3)));
  return (
    <section ref={ref} className="gh-strips" aria-labelledby="gh-strips-title">
      <div className="gh-wrap">
        <h2 id="gh-strips-title" className="gh-h2 gh-strips__title">This isn't just about an apartment.</h2>
      </div>
      <div className="gh-strips__row" aria-hidden="true">
        {images.map((src, i) => (
          <div key={i} className="gh-strips__item" style={{ '--i': i }}>
            <img src={src} alt="" loading="lazy" onError={hideBrokenImage} />
          </div>
        ))}
      </div>
      <div className="gh-wrap gh-strips__copy">
        <ScrollFill text="It's about where you wake up, how long your commute takes, and what you build next. You're not only buying square feet. You're choosing a neighbourhood." />
      </div>
    </section>
  );
}

/* ---------- 4. Pinned steps that light up one at a time ---------- */
const STEPS = [
  { title: 'Find it.', text: 'Filter by city, type and budget, then shortlist the apartments you like.' },
  { title: 'See it.', text: 'Book a private tour. The listing agent meets you on site and answers everything.' },
  { title: 'Hold it.', text: 'Reserve with a deposit. Once finance verifies it, the apartment is off the market for you.' },
  { title: 'Own it.', text: 'Settle the balance online and download your invoice. Refund rules are clear from day one.' }
];

function PinnedSteps({ onBrowse, onTerms }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  useScrollFrame(ref, (el, rect, vh) => {
    const p = trackProgress(rect, vh);
    el.style.setProperty('--p', p.toFixed(3));
    const idx = prefersReducedMotion() ? STEPS.length - 1 : Math.min(STEPS.length - 1, Math.floor(p * STEPS.length * 1.05));
    setActive((prev) => (prev === idx ? prev : idx));
  });
  return (
    <section ref={ref} className="gh-pinned" aria-labelledby="gh-pinned-title">
      <div className="gh-pinned__sticky">
        <div className="gh-wrap gh-pinned__grid">
          <div className="gh-pinned__left">
            <h2 id="gh-pinned-title" className="gh-h2">Buying, simplified.</h2>
            <div className="gh-pinned__actions">
              <button type="button" className="gh-btn gh-btn--ink" onClick={onBrowse}>Browse apartments</button>
            </div>
            <div className="gh-pinned__bar" aria-hidden="true"><span /></div>
          </div>
          <ol className="gh-pinned__steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className={i <= active ? 'is-on' : ''} aria-current={i === active ? 'step' : undefined}>
                <span className="gh-pinned__num">{String(i + 1).padStart(2, '0')}</span>
                <p><strong>{s.title}</strong> {s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- 7. Sell / agents block with drifting images ---------- */
function SellSection({ onSell, onJoinAgent }) {
  const ref = useRef(null);
  useScrollFrame(ref, (el, rect, vh) => el.style.setProperty('--p', passProgress(rect, vh, 1, 0).toFixed(3)));
  return (
    <section ref={ref} className="gh-sell gh-wrap" aria-labelledby="gh-sell-title">
      <div className="gh-sell__media" aria-hidden="true">
        <div className="gh-sell__tall"><img src={IMAGES.sellTall} alt="" loading="lazy" onError={hideBrokenImage} /></div>
        <div className="gh-sell__small"><img src={IMAGES.sellSmall} alt="" loading="lazy" onError={hideBrokenImage} /></div>
      </div>
      <div className="gh-sell__copy">
        <ScrollFill as="h2" id="gh-sell-title" className="gh-h2" text="Selling? We'll bring the buyers." start={0.9} end={0.55} />
        <ScrollFill className="gh-sell__text" text="Owners list for free and every listing is checked before it goes live. Accredited agents run the tours, answer buyer questions and keep you updated until the deposit lands." />
        <div className="gh-sell__actions">
          <button type="button" className="gh-btn gh-btn--ink" onClick={onSell}>List your apartment</button>
          <button type="button" className="gh-btn gh-btn--line" onClick={onJoinAgent}>Join as an agent</button>
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. Testimonials: photo + quote + dots ---------- */
function Testimonials({ reviews, onOpenListing }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = reviews.length;

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count) return null;
  const r = reviews[index % count];
  const photo = r.listingRef?.imageUrl;

  return (
    <section
      className="gh-section gh-wrap gh-testi"
      aria-labelledby="gh-testi-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ScrollFill as="h2" id="gh-testi-title" className="gh-h2" text="Don't take our word for it." start={0.9} end={0.6} />
      <div className="gh-testi__grid">
        <div className="gh-testi__photo" key={`p-${index}`}>
          {photo ? <img src={photo} alt="" loading="lazy" onError={hideBrokenImage} /> : null}
        </div>
        <figure className="gh-testi__quote" key={`q-${index}`} aria-live="polite">
          <Quote size={34} className="gh-testi__mark" aria-hidden="true" />
          <div className="gh-quote__stars" aria-label={`${r.rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill={i < r.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}
          </div>
          <blockquote>{r.comment}</blockquote>
          <figcaption>
            <strong>{r.user?.fullName || 'Verified buyer'}</strong>
            {r.listingRef && (
              <button type="button" className="gh-link" onClick={() => onOpenListing(r.listingRef)}>{r.listingTitle}</button>
            )}
          </figcaption>
          {count > 1 && (
            <div className="gh-testi__nav">
              <button type="button" className="gh-round" aria-label="Previous review" onClick={() => setIndex((i) => (i - 1 + count) % count)}><ChevronLeft size={20} /></button>
              <div className="gh-dots" role="group" aria-label="Choose review">
                {reviews.map((_, i) => (
                  <button key={i} type="button" className={i === index % count ? 'is-on' : ''} aria-label={`Review ${i + 1} of ${count}`} aria-pressed={i === index % count} onClick={() => setIndex(i)} />
                ))}
              </div>
              <button type="button" className="gh-round" aria-label="Next review" onClick={() => setIndex((i) => (i + 1) % count)}><ChevronRight size={20} /></button>
            </div>
          )}
        </figure>
      </div>
    </section>
  );
}

/* ---------- 9. Dark rows: image opens behind the word ---------- */
function HelpRows({ rows }) {
  const ref = useRef(null);
  const [active, setActive] = useState(-1);
  const [hovered, setHovered] = useState(-1);
  useScrollFrame(ref, (el, rect, vh) => {
    // On touch screens there is no hover, so open the row nearest the middle of the screen.
    const items = el.querySelectorAll('.gh-help__row');
    let best = -1;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const r = item.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < bestDist && d < vh * 0.22) { best = i; bestDist = d; }
    });
    setActive((prev) => (prev === best ? prev : best));
  });
  const current = hovered >= 0 ? hovered : active;
  return (
    <ul ref={ref} className="gh-help" onMouseLeave={() => setHovered(-1)}>
      {rows.map((row, i) => (
        <li key={row.word}>
          <button
            type="button"
            className={`gh-help__row ${current === i ? 'is-open' : ''}`}
            onClick={row.action}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            aria-label={`${row.word}: ${row.label}`}
          >
            <span className="gh-help__bg" style={{ backgroundImage: `url(${row.image})` }} aria-hidden="true" />
            <span className="gh-help__text">{row.text}</span>
            <span className="gh-help__word" aria-hidden="true">{row.word}</span>
            <span className="gh-help__go" aria-hidden="true"><ArrowRight size={30} /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 10. Horizontal service cards ---------- */
function ServiceStrip({ cards }) {
  const ref = useRef(null);
  const scrollBy = (dir) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 20 : 360;
    el.scrollBy({ left: dir * step, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  return (
    <section className="gh-services" aria-labelledby="gh-services-title">
      <div className="gh-wrap gh-services__head">
        <div>
          <ScrollFill as="h2" id="gh-services-title" className="gh-h2 gh-h2--light" text="Help beyond the purchase." start={0.95} end={0.6} />
          <p className="gh-services__intro">The market never stands still, and neither do we. These tools stay with you after you find the place.</p>
        </div>
        <div className="gh-services__nav">
          <button type="button" className="gh-round gh-round--light" aria-label="Scroll services left" onClick={() => scrollBy(-1)}><ChevronLeft size={20} /></button>
          <button type="button" className="gh-round gh-round--light" aria-label="Scroll services right" onClick={() => scrollBy(1)}><ChevronRight size={20} /></button>
        </div>
      </div>
      <ul ref={ref} className="gh-services__list" tabIndex={0} aria-label="Services">
        {cards.map((c) => (
          <li key={c.title}>
            <button type="button" className="gh-service" onClick={c.action}>
              <img src={c.image} alt="" loading="lazy" onError={hideBrokenImage} />
              <span className="gh-service__shade" aria-hidden="true" />
              <span className="gh-service__title">{c.title}</span>
              <span className="gh-service__text">{c.text}</span>
              <span className="gh-service__cta">{c.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Reading dialog for guides & notices ---------- */
function ReadingDialog({ item, onClose, onAction }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!item) return undefined;
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [item, onClose]);
  if (!item) return null;
  const actionLabel = { browse: 'Browse apartments', terms: 'Read the purchase terms', tour: 'Sign in to book a tour' }[item.action];
  return (
    <div className="gh-dialog" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gh-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="gh-dialog-title">
        <button ref={closeRef} type="button" className="gh-dialog__close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <p className="gh-dialog__tag">{item.tag}{item.date ? ` · ${item.date}` : ''}</p>
        <h2 id="gh-dialog-title">{item.title}</h2>
        {item.body.map((para, i) => <p key={i}>{para}</p>)}
        <div className="gh-dialog__actions">
          {actionLabel && <button type="button" className="gh-btn gh-btn--ink" onClick={() => { onClose(); onAction(item.action); }}>{actionLabel}</button>}
          <button type="button" className="gh-btn gh-btn--line" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* =================================================================== */

export default function GuestHome({
  onSearch,
  onOpenListing,
  onFilterCity,
  onNavigate,
  onOpenAuth,
  onRequireBuyer,
  onSell,
  onJoinAgent,
  onNewsletter,
  onOpenLegal,
  onOpenAdminPortal,
  announcements = []
}) {
  const [listings, setListings] = useState([]);
  const [listingsState, setListingsState] = useState('loading');
  const [reviews, setReviews] = useState([]);
  const [reading, setReading] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getPublicListings()
      .then(async (list) => {
        if (cancelled) return;
        const sorted = (list || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
        setListings(sorted);
        setListingsState(sorted.length ? 'ready' : 'empty');
        // Reviews endpoint is public and not rate-limited; check every listing (capped at 40).
        const batches = await Promise.all(
          sorted.slice(0, 40).map((l) => api.getListingReviews(l.id)
            .then((r) => (r || []).map((rev) => ({ ...rev, listingTitle: l.title, listingRef: l })))
            .catch(() => []))
        );
        if (cancelled) return;
        setReviews(batches.flat().filter((r) => r.comment && r.rating >= 4).slice(0, 6));
      })
      .catch(() => { if (!cancelled) setListingsState('error'); });
    return () => { cancelled = true; };
  }, []);

  const cityCounts = useMemo(() => {
    const counts = {};
    listings.forEach((l) => { if (l.city) counts[l.city] = (counts[l.city] || 0) + 1; });
    return counts;
  }, [listings]);
  const places = useMemo(() => {
    const withCounts = CITIES.filter((c) => cityCounts[c]);
    return (withCounts.length ? withCounts : CITIES.slice(0, 6)).slice(0, 8);
  }, [cityCounts]);

  // Strip photos: live listing photos where available, otherwise the defaults.
  const stripImages = useMemo(() => {
    const live = listings.map((l) => l.imageUrl).filter(Boolean).slice(0, 5);
    return live.length >= 5 ? live : IMAGES.strips;
  }, [listings]);

  const resources = useMemo(() => {
    const notices = (announcements || [])
      .filter((a) => a.active !== false && (a.targetRole || 'ALL').toUpperCase() === 'ALL')
      .slice(0, 3)
      .map((n) => ({
        id: `n-${n.id}`,
        tag: 'Notice',
        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        title: n.title,
        excerpt: n.content,
        body: [n.content]
      }));
    return [...notices, ...GUIDES];
  }, [announcements]);

  const featured = listings.slice(0, 5);
  const leadListing = listings[0];

  const runGuideAction = useCallback((action) => {
    if (action === 'browse') onSearch({});
    if (action === 'terms') onOpenLegal('terms');
    if (action === 'tour') onRequireBuyer('Sign in as a buyer to book a private tour.');
  }, [onSearch, onOpenLegal, onRequireBuyer]);
  const closeReading = useCallback(() => setReading(null), []);

  const helpRows = [
    { word: 'Buy', image: IMAGES.help.Buy, label: 'Browse apartments', text: 'Search verified apartments by city, budget and size. Compare finance options before you commit.', action: () => onSearch({}) },
    { word: 'Sell', image: IMAGES.help.Sell, label: 'List your apartment', text: 'Owners and agents list residences for review. Approved listings go live to every buyer.', action: onSell },
    { word: 'Tour', image: IMAGES.help.Tour, label: 'Book a tour', text: 'Book a private viewing at a time that suits you. An accredited agent meets you on site.', action: () => onRequireBuyer('Sign in as a buyer to book a private tour.') },
    { word: 'Ask', image: IMAGES.help.Ask, label: 'Contact support', text: 'Questions about a deposit, a refund or a listing? Send them to support and track the reply.', action: () => onNavigate('support') }
  ];

  const serviceCards = [
    { title: 'Repayment calculator', image: IMAGES.services[0], label: 'Try it on a listing', text: 'Estimate your deposit and monthly repayments on any apartment.', action: () => (leadListing ? onOpenListing(leadListing) : onSearch({})) },
    { title: 'Private tours', image: IMAGES.services[1], label: 'Book a tour', text: 'See the apartment with its agent before you put money down.', action: () => onRequireBuyer('Sign in as a buyer to book a private tour.') },
    { title: 'Refund protection', image: IMAGES.services[2], label: 'How refunds work', text: 'Clear refund rules for the first week after you reserve.', action: () => setReading(GUIDES[1]) },
    { title: 'Listing alerts', image: IMAGES.services[3], label: 'Save a search', text: 'Save a search and get an email when a match is listed.', action: onOpenAuth },
    { title: 'Support desk', image: IMAGES.services[4], label: 'Ask a question', text: 'Raise a ticket about any listing, payment or tour and track the reply.', action: () => onNavigate('support') }
  ];

  const submitNewsletter = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email address, like name@example.com.');
      return;
    }
    setEmailError('');
    onNewsletter(value);
  };

  return (
    <div className="gh">
      {/* 1. Hero → wordmark */}
      <IntroHero onSearch={onSearch} />

      {/* 2. Statement + aerial reveal */}
      <section className="gh-statement gh-wrap" aria-label="Why Property Flow">
        <div className="gh-statement__side">
          <p className="gh-kicker" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Why Property Flow <ArrowRight size={15} aria-hidden="true" />
          </p>
        </div>
        <ScrollFill className="gh-statement__text" text="Your life is changing. Don't just find a place — find what's next. We help you move forward with verified homes, accredited agents and one clear path from first look to keys." />
      </section>
      <div className="gh-wrap gh-wrap--wide">
        <RevealImage src={IMAGES.aerial} alt="A modern residence with a pool at dusk" />
      </div>

      {/* 3. Chevron strips */}
      <StripSection images={stripImages} />

      {/* 4. Pinned steps */}
      <PinnedSteps onBrowse={() => onSearch({})} onTerms={() => onOpenLegal('terms')} />

      {/* 5. Available now */}
      <section className="gh-section gh-wrap" aria-labelledby="gh-available">
        <div className="gh-section__head">
          <ScrollFill as="h2" id="gh-available" className="gh-h2" text="Available now" start={0.95} end={0.7} />
          <button type="button" className="gh-btn gh-btn--line" onClick={() => onSearch({})}>
            See all {listings.length ? listings.length : ''} apartments
          </button>
        </div>
        {listingsState === 'loading' && (
          <div className="gh-grid" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="gh-card gh-card--skeleton" />)}</div>
        )}
        {(listingsState === 'error' || listingsState === 'empty') && (
          <div className="gh-empty">
            <p>{listingsState === 'error'
              ? 'Listings could not be loaded. Check that the backend is running on port 8080, then refresh.'
              : 'No apartments are listed right now. Create an account and save a search to hear when one goes live.'}</p>
            <button type="button" className="gh-btn gh-btn--ink" onClick={listingsState === 'error' ? () => onSearch({}) : onOpenAuth}>
              {listingsState === 'error' ? 'Open search' : 'Create an account'}
            </button>
          </div>
        )}
        {listingsState === 'ready' && (
          <div className="gh-grid">
            {featured.map((l, i) => (
              <button type="button" key={l.id} className={`gh-card ${i === 0 ? 'gh-card--lead' : ''}`} onClick={() => onOpenListing(l)} aria-label={`View ${l.title}, ${l.city}, ${formatLKR(l.price)}`}>
                <div className="gh-card__img">
                  {l.imageUrl ? <img src={l.imageUrl} alt="" loading="lazy" onError={hideBrokenImage} /> : null}
                  {l.status === 'RESERVED' && <span className="gh-tag">Reserved</span>}
                </div>
                <div className="gh-card__body">
                  <div className="gh-card__row">
                    <h3 className="gh-card__title">{l.title}</h3>
                    <span className="gh-card__price">{formatLKR(l.price)}</span>
                  </div>
                  <p className="gh-card__meta">
                    <span><MapPin size={14} aria-hidden="true" />{l.city}</span>
                    <span><Bed size={14} aria-hidden="true" />{l.bedrooms} bed</span>
                    <span><Bath size={14} aria-hidden="true" />{l.bathrooms} bath</span>
                    <span><Maximize2 size={14} aria-hidden="true" />{Math.round(l.sizeSqft || 0).toLocaleString()} sqft</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 6. Places */}
      <section className="gh-section gh-wrap gh-places" aria-labelledby="gh-places">
        <ScrollFill as="h2" id="gh-places" className="gh-h2" text="Where you could live" start={0.95} end={0.7} />
        <ul className="gh-places__list">
          {places.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => onFilterCity(c)}>
                <span className="gh-places__name">{c}</span>
                <span className="gh-places__count">{cityCounts[c] ? `${cityCounts[c]} ${cityCounts[c] === 1 ? 'home' : 'homes'}` : 'View'}</span>
                <ArrowUpRight size={22} className="gh-places__arrow" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 7. Sell / agents */}
      <SellSection onSell={onSell} onJoinAgent={onJoinAgent} />

      {/* 8. Testimonials */}
      <Testimonials reviews={reviews} onOpenListing={onOpenListing} />

      {/* 9. Dark help rows */}
      <section className="gh-dark" aria-labelledby="gh-help">
        <div className="gh-wrap gh-dark__head">
          <p className="gh-kicker gh-kicker--light">Services</p>
          <ScrollFill as="h2" id="gh-help" className="gh-h2 gh-h2--light" text="How Property Flow can help you" start={0.95} end={0.6} />
        </div>
        <div className="gh-wrap"><HelpRows rows={helpRows} /></div>
      </section>

      {/* 10. Service cards */}
      <ServiceStrip cards={serviceCards} />

      {/* 11. Guides & notices */}
      <section className="gh-resources" aria-labelledby="gh-resources-title">
        <div className="gh-wrap gh-resources__grid">
          <div className="gh-resources__head">
            <ScrollFill as="h2" id="gh-resources-title" className="gh-h2" text="Guides & notices" start={0.95} end={0.6} />
            <p>Plain answers to the questions buyers ask most, plus the latest news from our team.</p>
            <button type="button" className="gh-btn gh-btn--ink" onClick={() => onNavigate('support')}>Ask a question</button>
          </div>
          <ul className="gh-resources__list">
            {resources.map((r) => (
              <li key={r.id}>
                <p className="gh-resources__meta">{r.tag}{r.date ? ` · ${r.date}` : ''}</p>
                <h3>{r.title}</h3>
                <p className="gh-resources__excerpt">{r.excerpt}</p>
                <button type="button" className="gh-btn gh-btn--line gh-btn--sm" onClick={() => setReading(r)} aria-label={`Read more: ${r.title}`}>Read more</button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 12. Closing photo with the footer sliding over it */}
      <div className="gh-curtain">
        <section className="gh-finale" aria-labelledby="gh-finale-title" style={{ backgroundImage: `linear-gradient(180deg, rgba(11,25,44,0.15), rgba(11,25,44,0.55)), url(${IMAGES.lounge})` }}>
          <h2 id="gh-finale-title">Your floor is out there. We'll help you get there.</h2>
          <button type="button" className="gh-btn gh-btn--light" onClick={() => onSearch({})}>Browse apartments</button>
        </section>

        <footer className="gh-footer">
          <div className="gh-wrap">
            <div className="gh-footer__top">
              <form className="gh-news" onSubmit={submitNewsletter} noValidate>
                <h2>Get new-listing alerts</h2>
                <label className="gh-news__field">
                  <span className="gh-sr">Email address</span>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }} placeholder="Enter your email" aria-invalid={!!emailError} aria-describedby="gh-news-help" />
                  <button type="submit" aria-label="Sign up for alerts"><ArrowRight size={20} /></button>
                </label>
                <p id="gh-news-help" className={emailError ? 'gh-news__error' : 'gh-news__help'}>
                  {emailError || "You'll create a free account, then save a search to switch alerts on."}
                </p>
                <div className="gh-footer__contact">
                  <div><h3>Head office</h3><a href="https://maps.google.com/?q=Marina+Tower+Colombo+Sri+Lanka" target="_blank" rel="noopener noreferrer">Level 18, Marina Tower,<br />Colombo 01</a></div>
                  <div><h3>Email us</h3><a href="mailto:inquiries@propertyflow.lk"><Mail size={14} aria-hidden="true" /> inquiries@propertyflow.lk</a></div>
                  <div><h3>Call us</h3><a href="tel:+94112345678"><Phone size={14} aria-hidden="true" /> +94 11 234 5678</a></div>
                </div>
              </form>

              <nav className="gh-footer__cols" aria-label="Footer">
                <div>
                  <h3>Explore</h3>
                  <button type="button" onClick={() => onSearch({})}>Search</button>
                  <button type="button" onClick={() => onSearch({ propertyType: 'Penthouse' })}>Penthouses</button>
                  <button type="button" onClick={() => onSearch({ propertyType: 'Luxury Suite' })}>Luxury suites</button>
                  <button type="button" onClick={() => onNavigate('favorites')}>Favourites</button>
                </div>
                <div>
                  <h3>Locations</h3>
                  {['Colombo', 'Rajagiriya', 'Kandy', 'Bentota'].map((c) => <button type="button" key={c} onClick={() => onFilterCity(c)}>{c}</button>)}
                </div>
                <div>
                  <h3>Company</h3>
                  <button type="button" onClick={onJoinAgent}>Join as an agent</button>
                  <button type="button" onClick={() => onNavigate('contact')}>Contact us</button>
                  <button type="button" onClick={() => onNavigate('support')}>Customer inquiries</button>
                  <button type="button" onClick={onOpenAuth}>Sign in</button>
                </div>
              </nav>
            </div>

            <div className="gh-footer__legal">
              <span>© 2026 Property Flow</span>
              <div>
                <button type="button" onClick={() => onOpenLegal('privacy')}>Privacy policy</button>
                <button type="button" onClick={() => onOpenLegal('terms')}>Terms of service</button>
                <button type="button" onClick={() => onOpenLegal('brokers')}>Broker directory</button>
                <button type="button" onClick={onOpenAdminPortal}>Staff portal</button>
              </div>
            </div>
          </div>
          <p className="gh-footer__mark" aria-hidden="true">FLOW</p>
        </footer>
      </div>

      <ReadingDialog item={reading} onClose={closeReading} onAction={runGuideAction} />
    </div>
  );
}
