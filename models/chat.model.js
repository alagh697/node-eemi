const { Schema, model, Types } = require('mongoose');

const ChatSchema = new Schema(
  {
    userA: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    userB: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessageText: { type: String, default: '' }, // pratique pour list view
  },
  { timestamps: true, versionKey: false }
);

// Assure un ordre stable (userA < userB)
ChatSchema.pre('validate', function (next) {
  if (this.userA && this.userB && String(this.userA) > String(this.userB)) {
    const tmp = this.userA;
    this.userA = this.userB;
    this.userB = tmp;
  }
  next();
});

// Paire unique
ChatSchema.index({ userA: 1, userB: 1 }, { unique: true });

ChatSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = model('Chat', ChatSchema);
