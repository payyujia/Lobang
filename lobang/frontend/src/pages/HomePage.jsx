import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import '../styles/HomePage.css';

function ListingGrid({ listings }) {
  return (
    <div className="listing-grid">
      {listings.map(l => <ListingCard key={l._id} listing={l} />)}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      {text}
    </div>
  );
}

export default function HomePage() {
  const [searchParams]       = useSearchParams();
  const [data, setData]      = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    fetch(`/api/home?${params.toString()}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) return (
    <div className="page">
      <div className="home-wrap">
        <div className="home-loading">Finding listings for you…</div>
      </div>
    </div>
  );

  const { queryRes, forYou, recent, nearYou, query } = data || {};

  return (
    <div className="page">
      <div className="home-wrap">
        {query ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Results</h2>
              {queryRes?.length > 0 && (
                <span className="section-sub">{queryRes.length} listing{queryRes.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {queryRes?.length === 0
              ? <EmptyState icon="🔍" text="No listings match your search." />
              : <ListingGrid listings={queryRes} />
            }
          </section>
        ) : (
          <>
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">For You</h2>
              </div>
              {forYou?.length === 0
                ? <EmptyState icon="✨" text="Add items to your offers to get personalised picks." />
                : <ListingGrid listings={forYou} />
              }
            </section>

            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Recently Listed</h2>
              </div>
              {recent?.length === 0
                ? <EmptyState icon="📦" text="No listings yet. Be the first!" />
                : <ListingGrid listings={recent} />
              }
            </section>
          </>
        )}
      </div>
    </div>
  );
}

