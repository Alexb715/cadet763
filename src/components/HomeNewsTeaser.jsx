import { pickT } from '../i18n.js';
import { BlogSection } from './BlogSection.jsx';
import { usePosts } from '../hooks/usePosts.js';

export function HomeNewsTeaser({ lang, layout, setPage }) {
  const t = pickT(lang);
  const { posts } = usePosts();
  return (
    <section
      className="section"
      style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="container">
        <div className="section-row reveal">
          <div>
            <span className="eyebrow">{t({ en: 'From our Facebook', fr: 'Depuis Facebook' })}</span>
            <h2 style={{ fontSize: 'clamp(32px,4.5vw,52px)', marginTop: 12 }}>
              {t({ en: 'Latest news', fr: 'Dernières nouvelles' })}
            </h2>
          </div>
          <button className="btn btn-ghost btn-arrow" onClick={() => setPage('news')}>
            {t({ en: 'See all news', fr: 'Toutes les nouvelles' })}
          </button>
        </div>
        <BlogSection posts={posts.slice(0, 4)} lang={lang} layout={layout} showFilters={false} />
      </div>
    </section>
  );
}
