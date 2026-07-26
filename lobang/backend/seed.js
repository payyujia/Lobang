const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const tags     = require('./seed/barter_tags.json');

dotenv.config({ path: './config.env' });

const tagSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  aliases:     { type: [String], default: [] },
  category:    { type: String, default: null },
  usageCount:  { type: Number, default: 0 },
}, { timestamps: true });

const Tag = mongoose.model('Tag', tagSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.DB);
    console.log('MongoDB connected');

    let inserted = 0;
    let skipped  = 0;

    for (const tag of tags) {
      const doc = {
        slug:        tag.slug,
        displayName: tag.displayName,
        aliases:     tag.aliases  ?? [],
        category:    tag.category ?? null,
        usageCount:  tag.usageCount ?? 0,
      };

      const exists = await Tag.findOne({ slug: doc.slug });
      if (exists) {
        console.log(`  skipped (already exists): ${doc.slug}`);
        skipped++;
        continue;
      }

      await Tag.create(doc);
      console.log(`  inserted: ${doc.slug}`);
      inserted++;
    }

    console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();