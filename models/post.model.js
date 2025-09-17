const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    excerpt: { type: String, trim: true, default: '', maxlength: 280 },
    content: { type: String, required: true, trim: true }, // markdown ou html au choix
    coverImageUrl: { type: String, trim: true, default: '' },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

// Index utiles
postSchema.index({ published: 1, publishedAt: -1 });
postSchema.index({ slug: 1 }, { unique: true });
// Recherche plein texte simple
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' }, { weights: { title: 5, excerpt: 3, content: 1 } });

// Harmonise la sortie JSON comme ton Product
postSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

// Helper pour définir publishedAt quand on publie
postSchema.pre('save', function (next) {
  if (this.isModified('published')) {
    if (this.published && !this.publishedAt) this.publishedAt = new Date();
    if (!this.published) this.publishedAt = null;
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
