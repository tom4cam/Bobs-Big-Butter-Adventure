import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from '../i18n';

export function SettingsCog() {
  const t = useT();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="settings-cog" ref={popoverRef}>
      <button
        type="button"
        className="cog-btn"
        aria-label={t('settings.title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {'⚙'}
      </button>
      {open && (
        <div className="cog-popover" role="dialog" aria-label={t('settings.title')}>
          <div className="cog-row">
            <span className="cog-label">{t('settings.language')}</span>
            <div className="cog-segmented">
              <button
                type="button"
                className={lang === 'en' ? 'on' : ''}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                {t('settings.languageEn')}
              </button>
              <button
                type="button"
                className={lang === 'sv' ? 'on' : ''}
                onClick={() => setLang('sv')}
                aria-pressed={lang === 'sv'}
              >
                {t('settings.languageSv')}
              </button>
            </div>
          </div>
          <button type="button" className="cog-close" onClick={() => setOpen(false)}>
            {t('settings.close')}
          </button>
        </div>
      )}
    </div>
  );
}
