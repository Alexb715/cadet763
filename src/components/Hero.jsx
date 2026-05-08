import { pickT } from '../i18n.js';
import { EditableText } from './EditableText.jsx';
import { PhotoPlaceholder } from './PhotoPlaceholder.jsx';
import { EditableImage } from './EditableImage.jsx';

function HeroEditable({ lang, content, editing, set }) {
  const t = pickT(lang);
  return (
    <>
      <div className="hero-eyebrow">
        <EditableText
          tag="span" className="eyebrow" editing={editing}
          value={t(content.heroEyebrow)}
          onChange={(v) => set('heroEyebrow', { ...content.heroEyebrow, [lang]: v })}
        />
      </div>
      <EditableText
        tag="h1" multiline editing={editing}
        value={t(content.heroTitle)}
        onChange={(v) => set('heroTitle', { ...content.heroTitle, [lang]: v })}
      />
      <EditableText
        tag="p" multiline className="lead" editing={editing}
        value={t(content.heroLead)}
        onChange={(v) => set('heroLead', { ...content.heroLead, [lang]: v })}
      />
      <div className="hero-cta">
        <a className="btn btn-primary btn-arrow">{t({ en: 'Join the squadron', fr: 'Joindre l’escadron' })}</a>
        <a className="btn btn-ghost">{t({ en: 'Visit a parade night', fr: 'Visiter un mercredi' })}</a>
      </div>
    </>
  );
}

function HeroStats({ lang }) {
  const t = pickT(lang);
  return (
    <div className="hero-stats">
      <div className="hero-stat"><div className="v">54</div><div className="k">{t({ en: 'years active', fr: 'ans d’activité' })}</div></div>
      <div className="hero-stat"><div className="v">12–18</div><div className="k">{t({ en: 'age range', fr: 'âge' })}</div></div>
      <div className="hero-stat"><div className="v">{t({ en: 'Free', fr: 'Gratuit' })}</div><div className="k">{t({ en: 'to join', fr: 'd’adhésion' })}</div></div>
    </div>
  );
}

function HeroFormation(props) {
  const { lang } = props;
  const t = pickT(lang);
  return (
    <section className="hero hero-formation">
      <div className="hero-grid container">
        <div>
          <HeroEditable {...props} />
          <HeroStats lang={lang} />
        </div>
        <div>
          <div className="hero-art">
            <svg className="formation-svg" viewBox="0 0 400 440" preserveAspectRatio="xMidYMid meet">
              <defs>
                <symbol id="plane" viewBox="-12 -10 24 20">
                  <path d="M0 -9 L2.4 -3 L11 -1 L11 2 L3 1 L1.5 7 L4 9 L4 10 L-4 10 L-4 9 L-1.5 7 L-3 1 L-11 2 L-11 -1 L-2.4 -3 Z" />
                </symbol>
              </defs>
              <path className="fm-trail" d="M 200 70 L 200 220 M 140 130 L 200 220 M 260 130 L 200 220 M 80 190 L 200 220 M 320 190 L 200 220" />
              <g className="fm-anim-1"><use href="#plane" x="172" y="40"  width="56" height="46" className="fm-plane lead" /></g>
              <g className="fm-anim-2"><use href="#plane" x="116" y="100" width="48" height="40" className="fm-plane" /></g>
              <g className="fm-anim-3"><use href="#plane" x="236" y="100" width="48" height="40" className="fm-plane" /></g>
              <g className="fm-anim-4"><use href="#plane" x="60"  y="160" width="44" height="36" className="fm-plane" /></g>
              <g className="fm-anim-2"><use href="#plane" x="296" y="160" width="44" height="36" className="fm-plane" /></g>
            </svg>
            <div className="formation-corner">
              <span className="dot"></span>
              <span>{t({ en: 'PARADE TONIGHT · 18:30', fr: 'CE SOIR · 18 h 30' })}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroHorizon(props) {
  const { lang } = props;
  return (
    <section className="hero hero-horizon">
      <div className="hero-grid container">
        <div>
          <HeroEditable {...props} />
          <HeroStats lang={lang} />
        </div>
        <div>
          <div className="hero-art">
            <div className="horizon-clouds"><span></span><span></span><span></span><span></span></div>
            <div className="horizon-line"></div>
            <div className="horizon-sun"></div>
            <div className="horizon-grid"></div>
            <svg className="horizon-plane-svg" viewBox="0 0 100 60">
              <path
                d="M50 5 L55 25 L90 30 L90 35 L55 33 L52 50 L60 55 L60 58 L40 58 L40 55 L48 50 L45 33 L10 35 L10 30 L45 25 Z"
                fill="var(--accent)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth=".5"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroType(props) {
  const { lang, content, editing, setImage } = props;
  const t = pickT(lang);
  const ticker = [
    'Aviation',
    t({ en: 'Leadership', fr: 'Leadership' }),
    t({ en: 'Citizenship', fr: 'Civisme' }),
    t({ en: 'Adventure', fr: 'Aventure' }),
    'Drill',
    t({ en: 'Survival', fr: 'Survie' }),
    t({ en: 'Music', fr: 'Musique' }),
    t({ en: 'Marksmanship', fr: 'Tir' }),
  ];
  const images = content?.images || {};
  return (
    <section className="hero hero-type">
      <div className="hero-grid container">
        <div>
          <HeroEditable {...props} />
          <div className="hero-art-row">
            <EditableImage
              slot="hero.formation" url={images['hero.formation']}
              label={t({ en: 'cadets in formation', fr: 'cadets en formation' })}
              editing={editing} onPick={setImage} lang={lang}
              style={{ aspectRatio: '4 / 5' }}
            />
            <EditableImage
              slot="hero.glider" url={images['hero.glider']}
              label={t({ en: 'glider', fr: 'planeur' })}
              editing={editing} onPick={setImage} lang={lang}
              style={{ aspectRatio: '4 / 5' }}
            />
            <EditableImage
              slot="hero.portrait" url={images['hero.portrait']}
              label={t({ en: 'CO portrait', fr: 'portrait CMDT' })}
              editing={editing} onPick={setImage} lang={lang}
              style={{ aspectRatio: '4 / 5' }}
            />
          </div>
        </div>
      </div>
      <div className="ticker">
        <div className="ticker-track">
          {[0, 1].map((dup) =>
            ticker.map((w, i) => (
              <span key={`${dup}-${i}`} className="ticker-item">
                <span className="star">★</span> {w}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export function Hero({ which, ...props }) {
  if (which === 'horizon') return <HeroHorizon {...props} />;
  if (which === 'type')    return <HeroType {...props} />;
  return <HeroFormation {...props} />;
}
