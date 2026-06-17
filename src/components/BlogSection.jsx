import { useState } from 'react';
import { pickT } from '../i18n.js';
import { PhotoPlaceholder } from './PhotoPlaceholder.jsx';

// Parse a bare 'YYYY-MM-DD' as a LOCAL date. `new Date('2025-10-22')` parses as
// UTC midnight, which renders a day earlier in timezones west of UTC (e.g. the
// squadron's own Atlantic time), so build the date from parts instead.
function parseLocalDate(s) {
  if (typeof s === 'string') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(s);
}

function PostMeta({ post, lang }) {
  const t = pickT(lang);
  const cats = {
    events:    { en: 'Events',    fr: 'Événements' },
    training:  { en: 'Training',  fr: 'Instruction' },
    community: { en: 'Community', fr: 'Communauté' },
  };
  const d = parseLocalDate(post.date);
  const dateStr = d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <div className="post-meta">
      <span className="cat">{t(cats[post.cat] || { en: post.cat, fr: post.cat })}</span>
      <span className="dot"></span>
      <span>{dateStr}</span>
    </div>
  );
}

const STAT_ICONS = {
  like: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>,
  comment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>,
};

function PostStats({ post, lang }) {
  const t = pickT(lang);
  const items = [
    { ic: 'like', n: post.likes, label: t({ en: 'likes', fr: 'mentions j’aime' }) },
    { ic: 'comment', n: post.comments, label: t({ en: 'comments', fr: 'commentaires' }) },
    { ic: 'share', n: post.shares, label: t({ en: 'shares', fr: 'partages' }) },
  ];
  return (
    <div className="post-stats">
      {items.map((it) => (
        <span key={it.ic}>
          <span className="post-stat-ic" aria-hidden="true">{STAT_ICONS[it.ic]}</span>
          {it.n}
          <span className="sr-only"> {it.label}</span>
        </span>
      ))}
    </div>
  );
}

function PostImage({ image, feature }) {
  const aspectRatio = feature ? '16/9' : '16/10';
  // Backend posts return image as an absolute or root-relative URL; legacy mock
  // posts pass a slug like "parade-night-october" which renders as a label.
  if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('/'))) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        style={{ width: '100%', aspectRatio, objectFit: 'cover', borderRadius: 14, display: 'block' }}
      />
    );
  }
  const label = typeof image === 'string' ? image.replace(/-/g, ' ') : '';
  return <PhotoPlaceholder label={label} style={{ aspectRatio }} />;
}

export function PostCard({ post, lang, feature = false }) {
  const t = pickT(lang);
  const fbHref = post.permalink || 'https://facebook.com/';
  return (
    <article className={'post' + (feature ? ' post-feature' : '')}>
      <PostImage image={post.image} feature={feature} />
      <div className="post-body">
        <PostMeta post={post} lang={lang} />
        <h3>{t(post.title)}</h3>
        <p>{t(post.body)}</p>
        <div className="post-foot">
          <PostStats post={post} lang={lang} />
          <a href={fbHref} target="_blank" rel="noopener noreferrer">
            {t({ en: 'View on Facebook', fr: 'Voir sur Facebook' })} →
          </a>
        </div>
      </div>
    </article>
  );
}

function BlogFeatured({ posts, lang }) {
  const [head, ...rest] = posts;
  return (
    <div className="blog-featured-grid">
      {head && <PostCard post={head} lang={lang} feature />}
      <div className="secondary">
        {rest.slice(0, 3).map((p) => <PostCard key={p.id} post={p} lang={lang} />)}
      </div>
    </div>
  );
}

function BlogCards({ posts, lang }) {
  return (
    <div className="blog-cards">
      {posts.map((p) => <PostCard key={p.id} post={p} lang={lang} />)}
    </div>
  );
}

function BlogTimeline({ posts, lang }) {
  return (
    <div className="blog-timeline">
      {posts.map((p) => {
        const d = parseLocalDate(p.date);
        return (
          <div key={p.id} className="blog-timeline-item">
            <div className="blog-timeline-date">
              <b>{d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric' })}</b>
              {d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short' })}
            </div>
            <PostCard post={p} lang={lang} />
          </div>
        );
      })}
    </div>
  );
}

const FILTERS = [
  ['all',       { en: 'All',       fr: 'Tout' }],
  ['events',    { en: 'Events',    fr: 'Événements' }],
  ['training',  { en: 'Training',  fr: 'Instruction' }],
  ['community', { en: 'Community', fr: 'Communauté' }],
];

export function BlogSection({ posts, lang, layout, showFilters = true, limit = null }) {
  const t = pickT(lang);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? posts : posts.filter((p) => p.cat === filter);
  const sliced = limit ? filtered.slice(0, limit) : filtered;
  return (
    <div className="reveal">
      {showFilters && (
        <div className="blog-filters">
          {FILTERS.map(([k, lbl]) => (
            <button
              key={k}
              className={'blog-filter' + (filter === k ? ' on' : '')}
              onClick={() => setFilter(k)}
            >
              {t(lbl)}
            </button>
          ))}
        </div>
      )}
      {layout === 'cards'    && <BlogCards posts={sliced} lang={lang} />}
      {layout === 'timeline' && <BlogTimeline posts={sliced} lang={lang} />}
      {(!layout || layout === 'featured') && <BlogFeatured posts={sliced} lang={lang} />}
    </div>
  );
}
