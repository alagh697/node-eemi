const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email']
    },
    // On stocke "password" (hashé côté serveur avant save/login)
    password: { type: String, required: true, select: false }, // .select('+password') pour la vérif
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true, versionKey: false }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
