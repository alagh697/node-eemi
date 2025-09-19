const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const { Types } = require('mongoose');

function sortPair(a, b) {
  return String(a) < String(b) ? [a, b] : [b, a];
}

exports.ensureChat = async (req, res, next) => {
  try {
    const { peerId } = req.body || {};
    if (!peerId || !Types.ObjectId.isValid(peerId)) {
      return res.status(400).json({ message: 'peerId required' });
    }
    const [A, B] = sortPair(req.user.id, peerId).map((id) => new Types.ObjectId(id));
    let chat = await Chat.findOne({ userA: A, userB: B });
    if (!chat) chat = await Chat.create({ userA: A, userB: B, lastMessageAt: new Date() });
    res.status(201).json(chat.toJSON());
  } catch (e) { next(e); }
};

exports.listChats = async (req, res, next) => {
  try {
    const { limit, cursor } = req.query;
    const q = { $or: [{ userA: req.user.id }, { userB: req.user.id }] };
    const find = Chat.find(q).sort({ lastMessageAt: -1 }).limit(Number(limit) || 30);
    if (cursor) find.where('lastMessageAt').lt(new Date(cursor));
    const rows = await find.populate('userA', 'name email').populate('userB', 'name email').lean();

    const result = rows.map((c) => {
      const peer = String(c.userA._id) === String(req.user.id) ? c.userB : c.userA;
      return {
        id: String(c._id),
        peer: { id: String(peer._id), name: peer.name, email: peer.email },
        lastMessageAt: c.lastMessageAt,
        lastMessageText: c.lastMessageText || '',
      };
    });

    res.json(result);
  } catch (e) { next(e); }
};

exports.listMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { before, limit } = req.query;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid chat id' });

    const chat = await Chat.findById(id).lean();
    if (!chat) return res.status(404).json({ message: 'chat not found' });
    const isMember = [String(chat.userA), String(chat.userB)].includes(String(req.user.id));
    if (!isMember) return res.status(403).json({ message: 'forbidden' });

    const q = { chat: id };
    const find = Message.find(q).sort({ createdAt: -1 }).limit(Number(limit) || 30);
    if (before) find.where('createdAt').lt(new Date(before));
    const rows = await find.populate('sender', 'name email').lean();
    res.json(rows.reverse());
  } catch (e) { next(e); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, attachments } = req.body || {};
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid chat id' });
    if (!text && !(attachments && attachments.length)) return res.status(400).json({ message: 'empty message' });

    const chat = await Chat.findById(id).lean();
    if (!chat) return res.status(404).json({ message: 'chat not found' });
    const isMember = [String(chat.userA), String(chat.userB)].includes(String(req.user.id));
    if (!isMember) return res.status(403).json({ message: 'forbidden' });

    const msg = await Message.create({
      chat: id,
      sender: req.user.id,
      text: String(text || '').slice(0, 5000),
      attachments: attachments || [],
    });
    await Chat.findByIdAndUpdate(id, {
      $set: { lastMessageAt: msg.createdAt, lastMessageText: text?.slice(0, 140) || '' },
    });

    res.status(201).json(await msg.populate('sender', 'name email'));
  } catch (e) { next(e); }
};
