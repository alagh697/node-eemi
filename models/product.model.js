const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 }, // euros (nombre)
    imageUrl: { type: String, trim: true, default: '' },
    isAvailable: { type: Boolean, default: true }
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ isAvailable: 1 });

productSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);
