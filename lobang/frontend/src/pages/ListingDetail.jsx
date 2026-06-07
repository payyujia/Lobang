import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import '../styles/ListingDetail.css';

export default function ListingDetail() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [carouselIdx, setIdx]   = useState(0);

  // Offer creation state
  const [myListings, setMyListings]   = useState([]);
  const [selected, setSelected]       = useState([]);     // listingIds
  const [offerSearch, setOfferSearch] = useState('');
  const [submitting, setSub]          = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredMine = myListings.filter(l =>
    l.title.toLowerCase().includes(offerSearch.toLowerCase())
  );

  const toggleSelect = listingId => {
    setSelected(prev =>
      prev.includes(listingId)
        ? prev.filter(x => x !== listingId)
        : [...prev, listingId]
    );
  };
  // Replace the static fetch with a reactive one
useEffect(() => {
  if (!user) return;
  const controller = new AbortController();
  
  fetch(`/api/listings/mine/search?q=${encodeURIComponent(offerSearch)}`, { 
    credentials: 'include',
    signal: controller.signal,
  })
    .then(r => r.json())
    .then(d => setMyListings(d.listings || []))
    .catch(() => {});

  return () => controller.abort(); // cancel previous request on each keystroke
}, [offerSearch]); // ← re-runs every time offerSearch changes
  const handleOffer = async () => {
    if (!selected.length) return;
    setSub(true);
    try {
      const res = await fetch(`/api/listings/${id}/offers`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ offeredListings: selected }),
      });
      if (res.ok) {
        navigate(`/profile/${user.id}?tab=offers`);
      }
    } finally {
      setSub(false);
    }
  };

  const handleAction = async (url) => {
    await fetch(url, { method: 'POST', credentials: 'include' });
    // Reload data after action
    const d = await fetch(`/api/listings/${id}`, { credentials: 'include' }).then(r => r.json());
    setData(d);
  };

  if (loading) return <div className="page"><div className="detail-loading">Loading…</div></div>;
  if (!data?.listing) return <div className="page"><p>Listing not found.</p></div>;

  const { listing, seller, isOwner, offers, sellerSimilar } = data;
  const images = listing.images || [];

  return (
    <div className="page container">
      <div className="lf-wrap">

        {/*  LEFT: Image carousel  */}
        <div className="img-panel">
          <div className="carousel-main" style={{ position: 'relative' }}>
            {images.length > 0 ? (
              <img
                src={`/uploads/${images[carouselIdx]}`}
                alt={listing.title}
                className="carousel__img"
              />
            ) : (
              <div className="carousel__placeholder">
                <span>🖼️</span>
                <p>No images</p>
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  className="carousel-ctrl prev"
                  onClick={() => setIdx(i => Math.max(0, i - 1))}
                  disabled={carouselIdx === 0}
                >‹</button>
                <button
                  className="carousel-ctrl next"
                  onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))}
                  disabled={carouselIdx === images.length - 1}
                >›</button>
                <div className="carousel-dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={`dot${i === carouselIdx ? ' dot--active' : ''}`}
                      onClick={() => setIdx(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Seller card */}
          <div className="seller-card">
            <Link to={`/profile/${seller._id}`} className="seller-card__avatar">
              {seller.avatar
                ? <img src={`/uploads/${seller.avatar}`} alt={seller.name} />
                : <span>{seller.name?.charAt(0).toUpperCase()}</span>
              }
            </Link>
            <div className="seller-card__info">
              <Link to={`/profile/${seller._id}`} className="seller-card__name">{seller.name}</Link>
              {seller.location?.label && (
                <div className="seller-card__loc"><img src="/icons/location.svg" style={{ width: '1em', height: '1em'}}/> {seller.location.label}</div>
              )}
            </div>
            {!isOwner && (
              <Link to={`/chats`} className="btn btn--ghost btn--sm"><img src="/icons/chat1.svg" style={{ width: '1em', height: '1em'}}/>Message</Link>
            )}
          </div>
          
          {/* Title & meta */}
          <div style={{  padding: '0px 28px 24px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h1 className="form-title">{listing.title}</h1>
              {isOwner && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link to={`/listings/form?id=${listing._id}`} className="btn btn--primary btn--sm">✏️ Edit</Link>
                </div>
              )}
            </div>
              
            {listing.category && (
              <span className="offer-card__status offer-card__status--pending">{listing.category}</span>
            )}

            {listing.description && (
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginTop: 8 }}>
                {listing.description}
              </p>
            )}

            {listing.descTags?.length > 0 && (
              <div className="tag-pills" style={{ marginTop: 8 }}>
                {listing.descTags.map(tag => (
                  <span key={tag} className="tag-pill">{tag.replace(/-/g, ' ')}</span>
                ))}
              </div>
            )}

            {listing.desiredItems?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="text-sm" style={{ marginBottom: 6 }}>Looking for:</div>
                <div className="tag-pills">
                  {listing.desiredItems.map(item => (
                    <span key={item} className="tag-pill" style={{ background: 'var(--secondary)' }}>
                      {item.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

          {/*  Offers section  */}
          <div className="form-panel">
            <h2 className="form-title" style={{ fontSize: 20 }}>
              {isOwner ? `Offers (${offers.length})` : 'Make an Offer'}
            </h2>

            {/* Make offer panel — non-owner only */}
            {!isOwner && listing.status === 'active' && (
              <div className="offer-make-panel">
                <p className="text-sm">Select one or more of your listings to offer in exchange:</p>
                <input
                  className="tag-picker__input"
                  type="search"
                  placeholder="Search your listings…"
                  value={offerSearch}
                  onChange={e => setOfferSearch(e.target.value)}
                />
                <div className="offer-listing-grid">
                  {filteredMine.length === 0
                    ? <p className="text-sm">No listings found.</p>
                    : filteredMine.map(l => (
                      <div
                        key={l._id}
                        className={`offer-listing-item${selected.includes(l._id) ? ' offer-listing-item--selected' : ''}`}
                        onClick={() => toggleSelect(l._id)}
                      >
                        {l.images?.[0]
                          ? <img src={`/uploads/${l.images[0]}`} alt={l.title} />
                          : <div className="offer-listing-placeholder">⬜</div>
                        }
                        <div className="offer-listing-title">{l.title}</div>
                        {selected.includes(l._id) && <div className="offer-listing-check">✓</div>}
                      </div>
                    ))
                  }
                </div>
                {selected.length > 0 && (
                  <button
                    className="btn btn--primary"
                    onClick={handleOffer}
                    disabled={submitting}
                  >
                    {submitting ? 'Sending…' : `Offer ${selected.length} listing${selected.length > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            )}

            {/* Existing offers list */}
            {offers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {offers.map(offer => (
                  <OfferRow
                    key={offer._id}
                    offer={offer}
                    isOwner={isOwner}
                    listingId={id}
                    currentUserId={user.id}
                    onAction={handleAction}
                    navigate={navigate}
                  />
                ))}
              </div>
            ) : (
              !isOwner && <p className="text-sm" style={{ marginTop: 8 }}>No offers yet. Be the first!</p>
            )}
          </div>
      </div>
      <br/>
      {sellerSimilar?.length > 0 && (
        <div className="form-panel">
          <h2 className="form-title" style={{ fontSize: 18 }}>Similar listings by {seller.name}</h2>
          <div className="listing-grid">
            {sellerSimilar.map(l => <ListingCard key={l._id} listing={l} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferRow({ offer, isOwner, listingId, currentUserId, onAction,navigate }) {
  const thumb = offer.offeredListingId?.[0]?.images?.[0];
  const isMine = String(offer.offererId?._id || offer.offererId) === String(currentUserId);
  const perspective = isMine ? 'made' : 'received';

  const act = path => onAction(`/api/listings/${listingId}/offers/${offer._id}/${path}`);
  const goToChat = async () => {
    const res = await fetch('/api/chats/resolve', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId:    listingId,
        participant1: offer.offererId?._id,
      }),
    });
  const data = await res.json();
  if (data.chatId) navigate(`/chats/${data.chatId}`);
  };
  return (
  <div className="offer-card" style={{background:'var(--bg)'}}>
  
    {/* Col 1 — thumb */}
    <div className="offer-card__thumb">
      {thumb
        ? <img src={`/uploads/${thumb}`} alt="" />
        : '🎁'
      }
    </div>

    {/* Col 2 — title, sub, actions */}
    <div className="offer-card__body">
      <div className="offer-card__title">{offer.offeredListingId?.map(x => x.title).join(', ')}</div>
      <div className="offer-card__sub">from <Link to={`/profile/${offer.offererId?._id}`}>{offer.offererId?.name}</Link></div>
      {/* Action buttons below sub */}
      <div className="offer-card__actions">
      <button className="btn btn--ghost btn--sm" onClick={goToChat}>Message</button>
        {perspective === 'received' &&   offer.status === 'pending' && (
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => act('accept')}>✓ Accept</button>
            <button className="btn btn--danger btn--sm"    onClick={() => act('decline')}>✕ Decline</button>
          </>
        )}
        {perspective === 'received' && offer.status === 'accepted' && (
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => act('complete')}>✓ Complete</button>
            <button className="btn btn--danger btn--sm"    onClick={() => act('reopen')}>↺ Reopen</button>
          </>
        )}
        {perspective === 'made' && offer.status === 'accepted' && (
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => act('complete')}>✓ Complete</button>
            <button className="btn btn--danger btn--sm"    onClick={() => act('cancel')}>✕ Cancel</button>
          </>
        )}
        {perspective === 'made' && offer.status === 'pending' && (
          <button className="btn btn--danger btn--sm" onClick={() => act('cancel')}>✕ Cancel</button>
        )}
      </div>
    </div>

    {/* Col 3 — status + time */}
    <div className="offer-card__meta">
      <span className={`offer-card__status offer-card__status--${offer.status}`}>
        {offer.status?.charAt(0).toUpperCase()}{offer.status?.slice(1)}
      </span>
      <span className="offer-card__time">{timeAgo(offer.createdAt)}</span>
    </div>

  </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
