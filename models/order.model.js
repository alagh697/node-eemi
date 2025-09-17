const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const orderSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    total: { type: Number, required: true, min: 0 }, // somme des items au moment de l'achat
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed'
    }
  },
  { timestamps: true, versionKey: false }
);

orderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);
