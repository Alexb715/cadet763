import { pickT } from '../../i18n.js';
import { POSTS } from '../../data.js';
import { BlogSection } from '../BlogSection.jsx';

export function NewsPage({ lang, layout }) {
  const t = pickT(lang);
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t({ en: 'From our Facebook', fr: 'Depuis Facebook' })}</span>
          <h2>{t({ en: 'News & updates', fr: 'Nouvelles et annonces' })}</h2>
          <p className="lead">{t({
            en: 'Posts pulled from facebook.com/763AirCadets — refreshed weekly so families never miss a parade or change of plans.',
            fr: 'Publications de facebook.com/763AirCadets — mises à jour chaque semaine, pour ne rien manquer.',
          })}</p>
        </div>
        <BlogSection posts={POSTS} lang={lang} layout={layout} showFilters={true} />
      </div>
    </section>
  );
}
