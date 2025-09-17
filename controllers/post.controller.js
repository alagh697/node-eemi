const Post = require('../models/post.model');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 200);
}

// CREATE
exports.createPost = async (req, res, next) => {
  try {
    const { title, content, excerpt = '', coverImageUrl = '', published = false, slug } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const computedSlug = slug ? slugify(slug) : slugify(title);
    const exists = await Post.findOne({ slug: computedSlug }).lean();
    if (exists) {
      return res.status(409).json({ message: 'Slug already exists' });
    }

    const doc = await Post.create({
      title,
      slug: computedSlug,
      content,
      excerpt,
      coverImageUrl,
      published,
      publishedAt: published ? new Date() : null
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

// READ one
exports.getPost = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const doc = await Post.findOne(query).lean();
    if (!doc) return res.status(404).json({ message: 'Post not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// LIST
exports.listPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q = '', published, sort = '-publishedAt' } = req.query;

    const filter = {};
    if (published === 'true') filter.published = true;
    if (published === 'false') filter.published = false;
    if (q) filter.$text = { $search: q };

    const docs = await Post.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Post.countDocuments(filter);

    res.json({
      items: docs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE
exports.updatePost = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const doc = await Post.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Post not found' });

    const { title, content, excerpt, coverImageUrl, published, slug } = req.body;

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    if (excerpt !== undefined) doc.excerpt = excerpt;
    if (coverImageUrl !== undefined) doc.coverImageUrl = coverImageUrl;
    if (published !== undefined) doc.published = published;
    if (slug !== undefined) {
      const newSlug = slugify(slug || title || doc.title);
      const exists = await Post.findOne({ slug: newSlug, _id: { $ne: doc._id } }).lean();
      if (exists) return res.status(409).json({ message: 'Slug already exists' });
      doc.slug = newSlug;
    }

    await doc.save();
    res.json(doc.toJSON());
  } catch (err) {
    next(err);
  }
};

// DELETE
exports.deletePost = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const deleted = await Post.findOneAndDelete(query).lean();
    if (!deleted) return res.status(404).json({ message: 'Post not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
