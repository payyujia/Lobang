const User         = require('../models/userModel');
const Offer        = require('../models/offerModel');
const Listing      = require('../models/listingModel');
const Notification = require('../models/notificationModel');
const Transaction  = require('../models/transactionModel');
const { getOrCreateChatForOffer } = require('../models/chatModel');
const {pushNotification} = require('../socketSetup')
// GET /api/listings/:id
exports.showListing = async (req, res) => {
  try {
    const listing = await Listing.incrementViews(req.params.id).populate('ownerId');
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const seller  = listing.ownerId;
    const isOwner = req.session.user.id === String(seller._id);

    let offers = await Offer.retrieveForListing(listing._id)
      .populate('offeredListingId')
      .populate('offererId', 'name avatar')
      .sort({ createdAt: -1 });

    const soleAcceptance = offers.find(o => o.status === 'accepted');
    offers = soleAcceptance ? [soleAcceptance] : offers;

    const sellerSimilar = await Listing.getSimilarListingsBySeller(
      seller, listing._id, listing.descTags
    );

    res.json({ listing, seller, isOwner, offers, sellerSimilar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers
exports.createOffer = async (req, res) => {
  try {
    const listing = await Listing.incrementOffers(req.params.id);
    const { offeredListings } = req.body;

    const offer = await Offer.create(
      req.params.id, req.session.user.id, offeredListings, 'pending'
    );
    await User.addToWishlist(req.session.user.id, req.params.id);
    const newNotif = await Notification.createNotification({
      recipientId: listing.ownerId,
      type:        'offer',
      message:     `${req.session.user.name} made an offer for ${listing.title}`,
      linkUrl:     `/listings/${req.params.id}`,
    });
    pushNotification(listing.ownerId, newNotif);

    res.status(201).json({ offer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers/:offerId/accept
exports.acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId)
      .populate('listingId', 'title ownerId')
      .populate('offererId', '_id name')
      .lean();

    await Offer.accept(offer._id);

    //  Create (or fetch existing) chat room for both parties 
    const chat = await getOrCreateChatForOffer(
      offer.listingId._id,
      String(offer.listingId.ownerId),
      String(offer.offererId._id)
    );

    const [partner, mine]=await Promise.all([
      Notification.createNotification({
        recipientId: offer.offererId._id,
        type:        'accept',
        message:     `${req.session.user.name} accepted your offer for "${offer.listingId.title}"`,
        linkUrl:     `/chats/${chat._id}`,
      }),
      Notification.createNotification({
        recipientId: req.session.user.id,
        type:        'accept',
        message:     `You accepted ${offer.offererId.name}'s offer for "${offer.listingId.title}"`,
        linkUrl:     `/chats/${chat._id}`,
      }),
    ]);
    pushNotification(offer.offererId._id, partner);
    pushNotification(req.session.user.id, mine);

    res.json({ offer, chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers/:offerId/decline
exports.declineOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId)
      .populate('listingId', 'title')
      .lean();

    await Offer.decline(offer._id);
    const newNotif = await Notification.createNotification({
      recipientId: offer.offererId,
      type:        'reject',
      message:     `${req.session.user.name} declined your offer for "${offer.listingId.title}"`,
      linkUrl:     `/listings/${req.params.id}`,
    });
    pushNotification(offer.offererId, newNotif);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers/:offerId/reopen
exports.reopenOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId)
      .populate('listingId', 'title ownerId')
      .lean();

    await Offer.pend(offer._id);

    const otherId = String(offer.offererId) === String(req.session.user.id)
      ? offer.listingId.ownerId
      : offer.offererId;

    const [partner,mine] = await Promise.all([
      Notification.createNotification({
        recipientId: otherId,
        type:        'reject',
        message:     `${req.session.user.name} reopened the listing for "${offer.listingId.title}"`,
        linkUrl:     `/listings/${req.params.id}`,
      }),
      Notification.createNotification({
        recipientId: req.session.user.id,
        type:        'archive',
        message:     `You reopened "${offer.listingId.title}" — offers are live again`,
        linkUrl:     `/listings/${req.params.id}`,
      }),
    ]);
    pushNotification(otherId, partner);
    pushNotification(req.session.user.id, mine);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers/:offerId/complete
exports.completeOffer = async (req, res) => {
  try {
    const [listing, offer] = await Promise.all([
      Listing.findById(req.params.id),
      Offer.findById(req.params.offerId)
        .populate('offererId', '_id name')
        .populate('offeredListingId', 'title')
        .lean(),
    ]);

    const currentUserIsOfferer =
      String(offer.offererId._id) === String(req.session.user.id);
    const otherId   = currentUserIsOfferer ? listing.ownerId : offer.offererId._id;
    const otherName = currentUserIsOfferer ? 'the seller'    : offer.offererId.name;

    await Promise.all([
      Transaction.create({
        listingId:    req.params.id,
        participants: [listing.ownerId, offer.offererId._id],
        snapshot: {
          listingTitle: listing.title,
          offeredTitle: offer.offeredListingId.map(x => x.title),
        },
      }),
      Offer.deleteForListing(req.params.id),
      Listing.complete(req.params.id),
      User.removeListingFromAllWishlists(req.params.id),
    ]);
    const [mine,partner] = await Promise.all([
      Notification.createNotification({
        recipientId: req.session.user.id,
        type:        'archive',
        message:     `You completed the trade for "${listing.title}". Leave ${otherName} a review!`,
        linkUrl:     `/profile/${otherId}?tab=reviews`,
      }),
      Notification.createNotification({
        recipientId: otherId,
        type:        'archive',
        message:     `${req.session.user.name} completed the trade for "${listing.title}". Leave them a review!`,
        linkUrl:     `/profile/${req.session.user.id}?tab=reviews`,
      }),
    ]);
    pushNotification(otherId, partner);
    pushNotification(req.session.user.id, mine);
    res.json({ success: true, redirectTo: `/profile/${req.session.user.id}?tab=reviews` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings/:id/offers/:offerId/cancel
exports.cancelOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId)
      .populate('listingId', '_id title ownerId')
      .lean();

    await Promise.all([
      User.removeFromWishlist(req.session.user.id, req.params.id),
      Offer.cancel(offer._id),
    ]);
    const newNotif = await Notification.createNotification({
      recipientId: offer.listingId.ownerId,
      type:        'reject',
      message:     `${req.session.user.name} cancelled their offer for "${offer.listingId.title}"`,
      linkUrl:     `/listings/${req.params.id}`,
    });
    pushNotification(offer.listingId.ownerId, newNotif);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
