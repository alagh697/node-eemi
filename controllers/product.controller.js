const asyncHandler = require('../utils/async-handler');
const Product = require('../models/product.model');

exports.list = asyncHandler(async (_req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json({ items: products });
});

exports.getById = asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Produit introuvable' });
  res.json(p);
});

// (Optionnel admin)
exports.create = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Produit introuvable' });
  res.json(product);
});

exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Produit introuvable' });
  res.status(204).end();
});
