import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useT, useLang } from '../i18n';
import { SettingsCog } from './SettingsCog';
import { BookLogo } from './BookLogo';
import { LANG_FLAG } from '../lang';

interface Props {
  children: ReactNode;
  showExit?: boolean;
}

export function Layout({ children, showExit = false }: Props) {
  const t = useT();
  const { lang: uiLang, setLang } = useLang();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const toggleLang = () => setLang(uiLang === 'en' ? 'sv' : 'en');

  return (
    <div className="page">
      <div className="header">
        <Link to="/" className="brand">
          <BookLogo size={44} className="brand-logo" />
          <span className="brand-text">
            <span className="brand-word">
              {Array.from(t('brand.name')).map((ch, i) => (
                <span key={i} className={`brand-letter brand-letter--${i % 3}`}>{ch}</span>
              ))}
            </span>
            <small>{t('brand.tagline')}</small>
          </span>
        </Link>
        <div className="header-actions">
          {showExit && (
            <button
              type="button"
              className="back-btn"
              onClick={goBack}
              aria-label={t('nav.back')}
              title={t('nav.back')}
            >
              <span aria-hidden="true">{'←'}</span> {t('nav.back')}
            </button>
          )}
          <div className="header-row">
            <button
              type="button"
              className="lang-btn"
              onClick={toggleLang}
              aria-label={t('settings.language')}
              title={t('settings.language')}
            >
              {LANG_FLAG[uiLang]}
            </button>
            <SettingsCog />
          </div>
        </div>
      </div>
      {children}
      <div className="footer">{t('dedication.line')}</div>
    </div>
  );
}
