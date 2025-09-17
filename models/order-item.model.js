const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const orderItemSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: 'Order', required: true, index: true },
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    // prix au moment de l'achat (euros)
    priceAtPurchase: { type: Number, required: true, min: 0 }
    // Optionnel si tu veux afficher sans re-populate:
    // nameAtPurchase: { type: String, trim: true },
    // imageUrlAtPurchase: { type: String, trim: true, default: '' }
  },
  { timestamps: true, versionKey: false }
);

orderItemSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
