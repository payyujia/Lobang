import { Link } from 'react-router-dom';

export default function OfferCard({ offer, perspective, onRefresh, navigate }) {
  const thumb = offer.offeredListingId?.[0]?.images?.[0];

  const act = async (path) => {
    await fetch(`/api/listings/${offer.listingId?._id}/offers/${offer._id}/${path}`, {
      method: 'POST', credentials: 'include',
    });
    onRefresh?.();
  };
  const goToChat = async () => {
    const res = await fetch('/api/chats/resolve', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId:    offer.listingId?._id,
        participant1: offer.offererId?._id || offer.offererId,//person who made the offer
      }),
    });
  const data = await res.json();
  if (data.chatId) navigate(`/chats/${data.chatId}`);
  };
  return (
    <div className="offer-card">
      <div className="offer-card__thumb">
        {thumb
          ? <img src={`/uploads/${thumb}`} alt="" />
          : '🎁'
        }
      </div>

      <div className="offer-card__body">
        <div className="offer-card__title">
          {perspective === 'made'
            ? `You offered ${offer.offeredListingId?.map(x => x.title).join(', ')}`
            : (
              <>
                <Link to={`/profile/${offer.offererId?._id}`}>{offer.offererId?.name}</Link>
                {' '}offered {offer.offeredListingId?.map(x => x.title).join(', ')}
              </>
            )
          }
        </div>
        <div className="offer-card__sub">
          {perspective === 'made'
            ? <>For their: <Link to={`/listings/${offer.listingId?._id}`} className="sub-link">{offer.listingId?.title}</Link></>
            : <>For your: <Link to={`/listings/${offer.listingId?._id}`} className="sub-link">{offer.listingId?.title}</Link></>
          }
          {' '}· {timeAgo(offer.createdAt)}
        </div>
      </div>

      <button className="btn btn--ghost btn--sm" onClick={goToChat}><img src="/icons/chat1.svg" style={{ width: '1em', height: '1em'}}/>Message</button>
      {perspective === 'received' && offer.status !== 'accepted' && (
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

      <span className={`offer-card__status offer-card__status--${offer.status}`}>
        {offer.status?.charAt(0).toUpperCase()}{offer.status?.slice(1)}
      </span>
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
