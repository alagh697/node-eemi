// lib/ws-chat.js
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const Chat = require('../models/chat.model');       // à créer (cf. plus bas si pas déjà fait)
const Message = require('../models/message.model'); // à créer (cf. plus bas si pas déjà fait)

/**
 * Protocole JSON attendu:
 *  Client -> Serveur
 *    { type: "join", chatId: string }
 *    { type: "chat:send", chatId: string, text: string }
 *
 *  Serveur -> Clients (dans le chat)
 *    { type: "chat:new", chatId, message }
 */

function getAuthFromReq(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: String(payload.sub) };
  } catch {
    return null;
  }
}

function attachWs(server, path = '/ws') {
  const wss = new WebSocketServer({ server, path });

  // Map<chatId, Set<WebSocket>>
  const rooms = new Map();

  const joinRoom = (ws, chatId) => {
    if (ws._roomId) {
      const old = rooms.get(ws._roomId);
      if (old) { old.delete(ws); if (old.size === 0) rooms.delete(ws._roomId); }
    }
    if (!rooms.has(chatId)) rooms.set(chatId, new Set());
    rooms.get(chatId).add(ws);
    ws._roomId = chatId;
  };

  const broadcast = (chatId, payload) => {
    const set = rooms.get(chatId);
    if (!set) return;
    const data = JSON.stringify(payload);
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  };

  // Heartbeat pour nettoyer les connexions mortes
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws._alive) return ws.terminate();
      ws._alive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('connection', (ws, req) => {
    ws._alive = true;
    ws.on('pong', () => (ws._alive = true));

    // Auth via ?token=
    const auth = getAuthFromReq(req);
    if (!auth) { ws.close(4401, 'unauthorized'); return; }
    ws._userId = auth.userId;

    ws.on('message', async (buf) => {
      let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg || typeof msg.type !== 'string') return;

      // Rejoindre un chat
      if (msg.type === 'join') {
        const chatId = msg.chatId;
        if (!Types.ObjectId.isValid(chatId)) return;
        const chat = await Chat.findById(chatId).lean();
        if (!chat) return;
        const isMember = [String(chat.userA), String(chat.userB)].includes(String(ws._userId));
        if (!isMember) return;
        joinRoom(ws, chatId);
        return;
      }

      // Envoyer un message
      if (msg.type === 'chat:send') {
        const chatId = msg.chatId;
        const text = (msg.text || '').toString().slice(0, 5000);
        if (!Types.ObjectId.isValid(chatId) || !text) return;

        const chat = await Chat.findById(chatId).lean();
        if (!chat) return;
        const isMember = [String(chat.userA), String(chat.userB)].includes(String(ws._userId));
        if (!isMember) return;

        // Persistance directe
        const doc = await Message.create({
          chat: chatId,
          sender: ws._userId,
          text,
          attachments: [],
        });
        await Chat.findByIdAndUpdate(chatId, {
          $set: { lastMessageAt: doc.createdAt, lastMessageText: text.slice(0, 140) },
        });
        const saved = (await doc.populate('sender', 'name email')).toJSON();

        broadcast(chatId, { type: 'chat:new', chatId, message: saved });
        return;
      }
    });

    ws.on('close', () => {
      if (ws._roomId) {
        const set = rooms.get(ws._roomId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) rooms.delete(ws._roomId);
        }
      }
    });
  });

  wss.on('close', () => clearInterval(heartbeat));

  return { wss };
}

module.exports = { attachWs };
