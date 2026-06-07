import { Link } from 'react-router-dom';
import '../styles/ListingCard.css';

export default function ListingCard({ listing, actions }) {
  const ownerName  = listing.ownerId?.name ?? listing.owner?.name ?? 'Unknown';
  const firstImage = listing.images?.[0];
  const tags       = [listing.category, ...(listing.descTags || [])].filter(Boolean);

  return (
    <div className="listing-card-wrap">
      <Link to={`/listings/${listing._id}`} className="listing-card">
        {firstImage
          ? <img className="listing-card__img" src={`/uploads/${firstImage}`} alt={listing.title} />
          : <div className="listing-card__img--placeholder">⬜</div>
        }
        <div className="listing-card__body">
          <div className="listing-card__title">{listing.title}</div>
          <div className="listing-card__owner">by {ownerName}</div>
          {tags.length > 0 && (
            <div className="tag-pills">
              {tags.slice(0, 3).map(tag => (
                <span key={tag} className="offer-card__status offer-card__status--pending">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Optional owner actions (edit/remove/relist) */}
      {actions && (
        <div className="listing-card-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
