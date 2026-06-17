import { pickT } from '../../i18n.js';
import { BlogSection } from '../BlogSection.jsx';
import { usePosts } from '../../hooks/usePosts.js';

export function NewsPage({ lang, layout }) {
  const t = pickT(lang);
  const { posts } = usePosts();
  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">{t({ en: 'From our Facebook', fr: 'Depuis Facebook' })}</span>
          <h1>{t({ en: 'News & updates', fr: 'Nouvelles et annonces' })}</h1>
          <p className="lead">{t({
            en: 'Posts pulled from facebook.com/763AirCadets, refreshed weekly so families never miss a parade or change of plans.',
            fr: 'Publications de facebook.com/763AirCadets, mises à jour chaque semaine, pour ne rien manquer.',
          })}</p>
        </div>
        <BlogSection posts={posts} lang={lang} layout={layout} showFilters={true} />
      </div>
    </section>
  );
}
