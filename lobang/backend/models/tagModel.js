const mongoose = require('mongoose');
const Fuse = require('fuse.js');

const tagSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  aliases:     { type: [String], default: [] },
  category:    { type: String, default: null },
  usageCount:  { type: Number, default: 0 },
}, { timestamps: true });

tagSchema.index(
  { displayName: 'text', aliases: 'text', slug: 'text' },
  { weights: { displayName: 10, aliases: 5, slug: 3 }, name: 'tag_text_index' }
);
tagSchema.index({ slug: 1 });

const Tag = mongoose.model('Tag', tagSchema);

async function searchTags(query, { limit = 10 } = {}) {
  if (!query?.trim()) return [];

  const candidates = await Tag.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' }, slug: 1, displayName: 1, aliases: 1, usageCount: 1 }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(50)
    .lean();

  if (!candidates.length) return [];

  const fuse = new Fuse(candidates, {
    keys: [
      { name: 'displayName', weight: 0.6 },
      { name: 'aliases',     weight: 0.3 },
      { name: 'slug',        weight: 0.1 },
    ],
    threshold: 0.8,
    includeScore: true,
  });

  return fuse.search(query)
    .map(({ item, score }) => ({ ...item, _blend: score - item.usageCount * 0.001 }))
    .sort((a, b) => a._blend - b._blend)
    .slice(0, limit)
    .map(({ _blend, ...tag }) => tag);
}

async function findTagBySlug(slug) {
  return Tag.findOne({ slug: slug.toLowerCase().trim() }).lean();
}

async function findOrCreateTag(displayName) {
  const slug = displayName.toLowerCase().trim().replace(/\s+/g, '-');
  const existing = await Tag.findOne({ slug }).lean();
  if (existing) return existing;
  return Tag.create({ slug, displayName: displayName.trim() });
}

async function incrementTagUsage(slugs) {
  return Tag.updateMany({ slug: { $in: slugs } }, { $inc: { usageCount: 1 } });
}

async function validateSlugs(slugs) {
  const found = await Tag.find({ slug: { $in: slugs } }, { slug: 1 }).lean();
  return found.map(t => t.slug);  // caller checks length vs input length
}

module.exports = { searchTags, findTagBySlug, findOrCreateTag, incrementTagUsage, validateSlugs };