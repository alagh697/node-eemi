const mongoose = require('mongoose');
const asyncHandler = require('../utils/async-handler');
const Order = require('../models/order.model');
const OrderItem = require('../models/order-item.model');
const Product = require('../models/product.model');

/**
 * POST /orders
 * 1) Vérifie items
 * 2) Récupère les produits (prix actuels)
 * 3) Calcule total
 * 4) Crée Order + OrderItems
 * 5) Retourne l’order avec ses items
 */
exports.create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) return res.status(400).json({ message: 'items est requis et ne peut pas être vide' });

  // Vérif IDs valides
  const areValid = items.every((id) => mongoose.isValidObjectId(id));
  if (!areValid) return res.status(400).json({ message: 'Un ou plusieurs productId invalides' });

  // Récupère tous les produits distincts pour leurs prix
  const uniqueIds = [...new Set(items)];
  const products = await Product.find({ _id: { $in: uniqueIds }, isAvailable: true });
  const mapById = new Map(products.map((p) => [String(p._id), p]));

  // Construire les OrderItems, vérifier que chaque id du payload existe
  const orderItemDocs = [];
  let total = 0;

  for (const pid of items) {
    const product = mapById.get(String(pid));
    if (!product) return res.status(400).json({ message: `Produit ${pid} introuvable ou indisponible` });
    orderItemDocs.push({
      product: product._id,
      priceAtPurchase: product.price
    });
    total += product.price;
  }

  // Créer l'Order
  const order = await Order.create({
    user: userId,
    total,
    status: 'confirmed'
  });

  // Associer l'order aux items et les insérer
  const docsWithOrder = orderItemDocs.map((d) => ({ ...d, order: order._id }));
  await OrderItem.insertMany(docsWithOrder);

  // Charger les items pour la réponse
  const itemsSaved = await OrderItem.find({ order: order._id }).populate('product');

  res.status(201).json({
    order: order.toJSON(),
    items: itemsSaved
  });
});

/**
 * GET /orders/me
 * Liste les commandes de l'utilisateur courant
 */
exports.listMine = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ items: orders });
});

/**
 * GET /orders/:id
 * Détail d'une commande + items (protégé, propriétaire ou admin)
 */
exports.getById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Commande introuvable' });

  const isOwner = String(order.user) === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Accès interdit' });

  const items = await OrderItem.find({ order: order._id }).populate('product');
  res.json({ order: order.toJSON(), items });
});

/**
 * GET /orders/:id/items
 * Items d'une commande (même protection que getById)
 */
exports.listItemsByOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Commande introuvable' });

  const isOwner = String(order.user) === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Accès interdit' });

  const items = await OrderItem.find({ order: order._id }).populate('product');
  res.json({ items });
});
