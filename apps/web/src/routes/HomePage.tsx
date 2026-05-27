import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { listStories } from '../api';
import { useT } from '../i18n';
import { getCreatorId } from '../creatorId';
import type { StorySummary } from '../types';

export function HomePage() {
  const t = useT();
  const [recent, setRecent] = useState<StorySummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const myId = getCreatorId();

  useEffect(() => {
    listStories()
      .then((items) => setRecent(items))
      .catch(() => { /* swallow */ })
      .finally(() => setLoaded(true));
  }, []);

  const ownedCount = useMemo(() => recent.filter((s) => s.creator_id === myId).length, [recent, myId]);
  const visible = useMemo(
    () => (showMineOnly ? recent.filter((s) => s.creator_id === myId) : recent),
    [recent, myId, showMineOnly]
  );

  return (
    <Layout>
      <div className="hero">
        <h1>{t('home.heroTitle')}</h1>
        <p>{t('home.heroBody')}</p>
        <Link to="/create" className="btn sun">{t('home.heroCta')}</Link>
      </div>

      <h2 style={{ marginTop: 8 }}>{t('home.recentHeading')}</h2>
      {ownedCount > 0 && (
        <div className="filter-pills">
          <button
            type="button"
            className={showMineOnly ? '' : 'on'}
            onClick={() => setShowMineOnly(false)}
            aria-pressed={!showMineOnly}
          >
            {t('home.filterAll')}
          </button>
          <button
            type="button"
            className={showMineOnly ? 'on' : ''}
            onClick={() => setShowMineOnly(true)}
            aria-pressed={showMineOnly}
          >
            {t('home.filterMine')} ({ownedCount})
          </button>
        </div>
      )}

      {!loaded && <div className="subtle">{t('home.recentLoading')}</div>}
      {loaded && visible.length === 0 && (
        <div className="note">{t('home.recentEmpty')}</div>
      )}
      {visible.length > 0 && (
        <div className="recent-list">
          {visible.map((s) => (
            <Link key={s.id} to={`/s/${s.id}`} className="recent-card">
              <div className="thumb">
                {s.cover_image_url
                  ? <img src={s.cover_image_url} alt={s.title} />
                  : <span style={{ fontSize: 60 }}>{'\u{1F4D6}'}</span>}
              </div>
              <div className="meta">
                <b>{s.title}</b>
                <span>v{s.latest_version}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
