const { Schema, model, Types } = require('mongoose');

const MessageSchema = new Schema(
  {
    chat: { type: Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, trim: true, maxlength: 5000 },
    // Optionnels
    readAt: { type: Date, default: null },
    attachments: [
      {
        url: String,
        kind: { type: String, enum: ['image', 'file', 'audio', 'video'], default: 'file' },
        name: String,
        size: Number,
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

MessageSchema.index({ chat: 1, createdAt: -1 });

MessageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = model('Message', MessageSchema);
