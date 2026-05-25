import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { SettingsCog } from './SettingsCog';

export function Layout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="page">
      <div className="header">
        <Link to="/" className="brand">
          {t('brand.name')}
          <small>{t('brand.tagline')}</small>
        </Link>
        <SettingsCog />
      </div>
      {children}
      <div className="footer">{t('dedication.line')}</div>
    </div>
  );
}
