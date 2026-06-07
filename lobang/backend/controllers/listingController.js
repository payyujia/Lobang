const fs = require('fs');
const path = require('path');
const Listing = require('../models/listingModel');
const Tag = require('../models/tagModel');
const User = require('../models/userModel');

function parseSlugs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function parseImages(files) {
  if (!files?.length) return [];
  return files.map(img => img.filename);
}

/**
 * GET /api/home
 * Recommendation pipeline:
 * 1.1 tag matching your listing's descTags against what other listings' desiredItems 
 * 1.2 tag matching your wishlist descTags for similar items 
 * 2. popularity 3. recency 4. [not implemented] location
 * Search mode (q or selectedCategories present):
 *   searches title and desc + category filter
 */
exports.homeGet = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const textQuery = req.query.q?.trim() || '';
    const page = parseInt(req.query.page) || 1;
    const selectedCategories = [].concat(req.query.selectedCategories || []).filter(Boolean);

    let queryRes = [], forYou = [], recent = [], nearYou = [];

    if (selectedCategories.length === 0 && !textQuery) {
      const user = userId
        ? await User.findById(userId).lean()
        : null;

      // Tags from the user's own active listings
      const ownedListings = userId
        ? await Listing.findByUser(userId).select('descTags').lean()
        : [];
      const ownedTags = ownedListings.flatMap(l => l.descTags || []);

      // Tags from listings saved in the user's wishlist
      const wishlistListings = user?.wishlist?.length
        ? await Listing.collateWishlistDescTags(user.wishlist)
        : [];
      const wishlistTags = wishlistListings.flatMap(l => l.descTags || []);

      console.log({ ownedTags, wishlistTags });

      const [tagged, recentRaw] = await Promise.all([
        Listing.getRecommendedListings(ownedTags, wishlistTags, userId),
        Listing.getRecentListings({ limit: 20 }),
      ]);

      forYou = tagged;
      recent = recentRaw;
    } else {
      queryRes = await Listing.searchListings({ textQuery, selectedCategories, page });
    }

    res.json({
      queryRes,
      forYou,
      recent,
      query: (selectedCategories.length > 0 || textQuery)
        ? { text: textQuery, selectedCategories }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/listings/form
exports.getListingForEdit = async (req, res) => {
  try {
    const listing = req.query.id ? await Listing.findById(req.query.id).lean() : null;
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/listings/:id
exports.getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('ownerId', 'name avatar').lean();
    if (!listing) return res.status(404).json({ error: 'Not found' });
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/update
exports.updateListing = async (req, res) => {
  try {
    const { id, title, description, category, desiredItems, descTags } = req.body;
    const kept = [].concat(req.body.keptImages || []).filter(Boolean);
    const newFiles = (req.files || []).map(f => f.filename);

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ error: 'Not found' });

    // Delete removed files from disk
    const removed = listing.images.filter(f => !kept.includes(f));
    removed.forEach(filename =>
      fs.unlink(path.resolve(__dirname, '../public/uploads', filename), err => {
        if (err) console.warn('Could not delete:', filename, err);
      })
    );

    await Listing.updateInfo(
      id, title, description,
      category || null,
      parseSlugs(desiredItems),
      parseSlugs(descTags),
      [...kept, ...newFiles],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/create
exports.createListing = async (req, res) => {
  try {
    const { title, description, category, descTags, desiredItems } = req.body;
    const listing = await Listing.create({
      ownerId: req.session.user.id,
      title,
      description,
      category: category || null,
      descTags: parseSlugs(descTags),
      desiredItems: parseSlugs(desiredItems),
      images: parseImages(req.files),
    });
    res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/tags/search?q=&limit=
exports.searchTags = async (req, res) => {
  const { q = '', limit = 8 } = req.query;
  if (!q.trim()) return res.json({ tags: [], canCreate: false });
  const tags = await Tag.searchTags(q, { limit: Number(limit) });
  const exactSlug = q.toLowerCase().trim().replace(/\s+/g, '-');
  const exactExists = tags.some(t => t.slug === exactSlug);
  res.json({ tags, canCreate: !exactExists });
};

// POST /api/tags
exports.createTag = async (req, res) => {
  const { displayName } = req.body;
  if (!displayName?.trim()) return res.status(400).json({ error: 'displayName required' });
  const tag = await Tag.findOrCreateTag(displayName);
  res.status(201).json({ tag });
};

// GET /api/listings/mine/search?q=
exports.myListingsSearch = async (req, res) => {
  try {
    const q = req.query.q || '';
    const listings = await Listing.searchOwnListings(q, req.session.user.id);
    res.json({ listings });
  } catch (err) {
    console.error('myListingsSearch error:', err.message);
    res.status(500).json({ listings: [], error: err.message });
  }
};
