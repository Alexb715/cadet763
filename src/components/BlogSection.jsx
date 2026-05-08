import { useState } from 'react';
import { pickT } from '../i18n.js';
import { PhotoPlaceholder } from './PhotoPlaceholder.jsx';

function PostMeta({ post, lang }) {
  const t = pickT(lang);
  const cats = {
    events:    { en: 'Events',    fr: 'Événements' },
    training:  { en: 'Training',  fr: 'Instruction' },
    community: { en: 'Community', fr: 'Communauté' },
  };
  const d = new Date(post.date);
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

function PostStats({ post }) {
  return (
    <div className="post-stats">
      <span>♥ {post.likes}</span>
      <span>💬 {post.comments}</span>
      <span>↗ {post.shares}</span>
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
          <PostStats post={post} />
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
        const d = new Date(p.date);
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
    <div>
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
