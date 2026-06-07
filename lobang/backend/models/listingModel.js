const mongoose = require('mongoose');
const Fuse = require('fuse.js');

const listingSchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true },
  description:  { type: String },
  images:       [{ type: String }],
  // Closed vocabulary
  category:     { type: String, default: null },
  descTags:     [{ type: String }],
  desiredItems: [{ type: String }],
  status:       { type: String, enum: ['active', 'traded', 'inactive'], default: 'active' },
  popularity: {
    views:  { type: Number, default: 0 },
    offers: { type: Number, default: 0 },
    likes:  { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now }
});

//  Indexes --
listingSchema.index({ status: 1, createdAt: -1 });   // recent listings feed
listingSchema.index({ 'location.coordinates': '2dsphere' }); //location
listingSchema.index({ desiredItems: 1 });             // tag-based recommendation
listingSchema.index({ category: 1, status: 1 });      // category filter
listingSchema.index(
  { title: 'text', description: 'text', descTags: 'text' }, 
  { weights: { title: 10, descTags: 7, description: 3 }, name: 'listing_text_index' }
);

const Listing = mongoose.model('Listing', listingSchema, 'listings');

//  Query helpers 
exports.updateInfo = function (id,title,description, category,desiredItems,descTags, images) {
  return Listing.updateOne({_id:id},{$set:{images,title,description,desiredItems,descTags, category}})
}
exports.create = function (l){
  return Listing.create(l)
}
exports.findById = function (id) {
  return Listing.findOne({_id:id})
}
exports.findByUser = function (ownerId) {
  return Listing.find({ownerId}).sort({ createdAt: -1 });
}
exports.findByIdandUser = function (ownerId,listingId) {
  return Listing.findOne({_id:listingId,ownerId});
}
exports.relist = function (id,ownerId) {
  return Listing.findOneAndUpdate(
    { _id: id , ownerId},
    { $set: { createdAt: new Date()} },
  );
};
exports.delete = function (id) {
  return Listing.deleteOne({_id:id});
};
exports.collateWishlistDescTags  = function (wishlist) {
  return Listing.find({ _id: { $in: wishlist } })
              .select('descTags')
              .lean();
};
exports.searchOwnListings = async function (query, ownerId, { limit = 10 } = {}) {
  if (!query?.trim() || !ownerId) return [];
  //  Step 1: MongoDB text search 
  // $text uses the listing_text_index we already built.
  // The filter has TWO conditions joined implicitly with AND:
  //   - { $text: { $search: query } } → only docs matching the search terms
  //   - { ownerId }                   → only this user's listings
  // MongoDB applies the index first (fast), then filters by ownerId.
  //
  // The projection adds a virtual 'score' field (MongoDB's relevance score)
  // which we can then sort by. Without { $meta: 'textScore' } in the
  // projection you can't reference it in .sort().
  const candidates = await Listing.find(
    {
      $text: { $search: query },
      ownerId,                      // scopes results to this user only
    },
    {
      score:       { $meta: 'textScore' }, // attach MongoDB relevance score
      title:       1,
      images:      1,
      status:      1,
      createdAt:   1,
      description: 1,
    }
  )
    .sort({ score: { $meta: 'textScore' } }) // best text matches first
    .limit(50)   // cap at 50: enough variety for Fuse, cheap to load
    .lean();     // plain JS objects — faster than full Mongoose documents

  if (!candidates.length) return [];

  //  Step 2: Fuse.js fuzzy re-rank 
  // Fuse searches only the 50 candidates Mongo returned (tiny array, instant).
  // This catches typos and partial matches that $text would miss.
  // 'threshold: 0.5' means strings up to ~50% different still match.
  const fuse = new Fuse(candidates, {
    keys: [
      { name: 'title',       weight: 0.8 }, // title matters most (mirrors index weight)
      { name: 'description', weight: 0.2 },
    ],
    threshold:    0.8,
    includeScore: true, // gives us the 0→1 fuzzy score per result
  });

  //  Step 3: Blend and return 
  // fuse.search() returns [{ item, score }] where score 0=perfect, 1=worst.
  // item.score is MongoDB's textScore (higher = better), so we invert it
  // with a small weight so both signals pull in the same direction.
  //
  // _blend = fuseScore - (mongoTextScore * 0.05)
  //   lower _blend → better result
  //   The mongo term rewards strong keyword matches even if slightly fuzzy.
  return fuse.search(query)
    .map(({ item, score: fuzeScore }) => ({
      ...item,
      _blend: fuzeScore - (item.score * 0.05),
    }))
    .sort((a, b) => a._blend - b._blend)
    .slice(0, limit)
    .map(({ _blend, score, ...listing }) => listing); // strip internal fields
};

exports.getRecentListings = function ({ limit = 20 } = {}) {
  return Listing.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('ownerId', 'name')
    .lean();
};

exports.getRecommendedListings = async function (ownedTags = [],wishlistTags = [],excludeId,{ limit = 20 } = {}) {
  if (!ownedTags.length && !wishlistTags.length) {return exports.getRecentListings({ limit });}
  const pipeline = [
    // 1. Active listings not owned by this user 
    {
      $match: {
        status: 'active',
        ownerId: { $ne: new mongoose.Types.ObjectId(excludeId) },
      },
    },

    // 2. tag matching
    {
      $addFields: {
        // How many of user's owned tags appear in this listing's desiredItems
        offerMatchScore: {
          $size: {
            $ifNull: [
              { $setIntersection: ['$desiredItems', ownedTags] },
              [],
            ],
          },
        },

        // How many of user's wishlist tags appear in this listing's descTags
        wishMatchScore: {
          $size: {
            $ifNull: [
              { $setIntersection: ['$descTags', wishlistTags] },
              [],
            ],
          },
        },

        popularityScore: {
          $add: [
            { $multiply: ['$popularity.likes',  2] },
            { $multiply: ['$popularity.offers', 3] },
            '$popularity.views',
          ],
        },
      },
    },

    // 3. Combined score
    {
      $addFields: {
        matchScore: { $add: ['$offerMatchScore', '$wishMatchScore'] },
      },
    },

    // 4. Keep only listings with at least one signal match 
    { $match: { matchScore: { $gt: 0 } } },

    // 5. Rank: total overlap → popularity → recency
    { $sort: { matchScore: -1, popularityScore: -1, createdAt: -1 } },
    { $limit: limit },

    // 6. Join owner
    {
      $lookup: {
        from: 'users',
        localField: 'ownerId',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: { path: '$owner' } },

    // 7. Shape output 
    {
      $project: {
        title: 1, description: 1, images: 1, category: 1,
        descTags: 1, desiredItems: 1, status: 1, popularity: 1, createdAt: 1,
        matchScore: 1, offerMatchScore: 1, wishMatchScore: 1,
        'owner._id': 1, 'owner.name': 1,
      },
    },
  ];

  const results = await Listing.aggregate(pipeline);

  //  8. Soft fallback: if the filter was too narrow, pad with recent 
  if (results.length < Math.ceil(limit / 2)) {
    const seen = new Set(results.map(r => r._id.toString()));
    const filler = await exports.getRecentListings({ limit });
    const fresh  = filler.filter(r => !seen.has(r._id.toString()));
    return [...results, ...fresh].slice(0, limit);
  }

  return results;
};
exports.searchListings = function ({ textQuery, selectedCategories = [], page = 1, limit = 24 } = {}) {
  const filter = { status: 'active' };
  if (textQuery.trim()) filter.$text = { $search: textQuery };
  if (selectedCategories?.length>0) filter.category = { $in: selectedCategories };
  const skip = (page - 1) * limit;
  const sort = textQuery.trim()
    ? { score: { $meta: 'textScore' } }
    : { createdAt: -1 };

  const projection = textQuery.trim()
    ? { score: { $meta: 'textScore' } }
    : {};
  return Listing.find(filter, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'name')
    .lean();
};

/**
 * Increment view count atomically. Call when a listing page is opened.
 */
exports.incrementViews = function (listingId) {
  return Listing.updateOne({ _id: listingId }, { $inc: { 'popularity.views': 1 } });
}
exports.getSimilarListingsBySeller = async function (ownerId, currentListingId, descTags, { limit = 4 } = {}) {
  // 1. Fetch active listings by this seller, excluding the current one
  let listings = await Listing.find({
    status: 'active',
    ownerId: ownerId,
    _id: { $ne: currentListingId }
  })
    .populate('ownerId', 'name')   // populate seller name
    .lean();

  // 2. Compute tag overlap score
  listings.forEach(l => {
    const overlap = l.descTags?.filter(tag => descTags.includes(tag)) || [];
    l.tagMatchScore = overlap.length;
  });

  // 3. Sort by tagMatchScore, then createdAt
  listings.sort((a, b) => {
    if (b.tagMatchScore !== a.tagMatchScore) return b.tagMatchScore - a.tagMatchScore;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // 4. Limit results
  return listings.slice(0, limit);
};

exports.complete = function (id) {
  return Listing.updateOne({_id:id},{status:'traded'});
};
