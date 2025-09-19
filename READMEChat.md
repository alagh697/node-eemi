# Front Next.js × API Chat (Express/Mongo + WebSocket)

Ce guide explique comment connecter un front **Next.js (App Router)** à l’API chat 1-to-1 (REST + WebSocket).

---

## 📦 Prérequis

- API démarrée (Express + Mongo) avec WebSocket sur `/ws`  
- Endpoints disponibles côté API :
  - Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
  - Chat: `/api/chat/ensure`, `/api/chat`, `/api/chat/:id/messages`  
- Variables d’environnement côté **front** :

```bash
# .env.local (Next.js)
NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 🔄 Flux d’intégration

1. **Register/Login** → récupérez le **JWT** et l’ID utilisateur.  
2. **Assurer le chat** avec un autre user :  
   ```http
   POST /api/chat/ensure
   Authorization: Bearer <JWT>
   Body: { "peerId": "<USER_ID>" }
   ```
   → récupérez `chat.id`.  
3. **Charger l’historique** :  
   ```http
   GET /api/chat/:chatId/messages
   Authorization: Bearer <JWT>
   ```
4. **Ouvrir le WebSocket** :  
   ```
   ws://localhost:8000/ws?token=<JWT>
   ```
   puis envoyer :  
   ```json
   { "type": "join", "chatId": "<CHAT_ID>" }
   ```
5. **Envoyer un message** via WS :  
   ```json
   { "type": "chat:send", "chatId": "<CHAT_ID>", "text": "hello" }
   ```
6. **Recevoir en temps réel** côté client :  
   ```json
   { "type": "chat:new", "chatId": "<CHAT_ID>", "message": { ... } }
   ```

---

## 🔑 Routes REST principales

### Auth

#### Register
```http
POST /api/auth/register
```

Body JSON :
```json
{ "name": "Alice Admin", "email": "admin@example.com", "password": "Secret123!", "role": "admin" }
```

> Le rôle `"admin"` est accepté uniquement si aucun admin n’existe encore (bootstrap).  
> Sinon, rôle forcé à `"user"`.

#### Login
```http
POST /api/auth/login
```

Body JSON :
```json
{ "email": "alice@example.com", "password": "Secret123!" }
```

#### Me
```http
GET /api/auth/me
Authorization: Bearer <JWT>
```

---

### Chat

#### Assurer un chat
```http
POST /api/chat/ensure
Authorization: Bearer <JWT>
```

Body :
```json
{ "peerId": "<USER_ID>" }
```

#### Lister mes chats
```http
GET /api/chat
Authorization: Bearer <JWT>
```

#### Lister messages
```http
GET /api/chat/:id/messages?limit=30
Authorization: Bearer <JWT>
```

---

## 🌐 WebSocket

**URL** :  
```
ws://localhost:8000/ws?token=<JWT>
```

**Client → Serveur**
```json
{ "type": "join", "chatId": "<CHAT_ID>" }
{ "type": "chat:send", "chatId": "<CHAT_ID>", "text": "hello" }
```

**Serveur → Client**
```json
{ "type": "chat:new", "chatId": "<CHAT_ID>", "message": { ... } }
```

---

## 🧩 Exemple de code (Next.js — App Router)

### Hook `useChatWs.js`

```js
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export function useChatWs({ jwt, chatId }) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const retryRef = useRef(0);

  // Charger l’historique initial
  useEffect(() => {
    async function load() {
      if (!jwt || !chatId) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_ORIGIN}/api/chat/${chatId}/messages`,
        { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" }
      );
      if (res.ok) setMessages(await res.json());
    }
    load();
  }, [jwt, chatId]);

  // Connexion WebSocket + reconnexion auto
  useEffect(() => {
    if (!jwt || !chatId) return;
    const url = `${process.env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(jwt)}`;
    let closedByUser = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
        ws.send(JSON.stringify({ type: "join", chatId }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "chat:new" && msg.chatId === chatId) {
            setMessages((prev) => [...prev, msg.message]);
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (closedByUser) return;
        const t = Math.min(1000 * 2 ** retryRef.current, 15000);
        retryRef.current += 1;
        setTimeout(connect, t);
      };
    };

    connect();
    return () => {
      closedByUser = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [jwt, chatId]);

  // Envoyer un message
  const sendMessage = useCallback((text) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "chat:send", chatId, text }));
    return true;
  }, [chatId]);

  return { connected, messages, sendMessage };
}
```

### Composant `ChatClient.jsx`

```jsx
"use client";
import { useState } from "react";
import { useChatWs } from "./useChatWs";

export default function ChatClient({ chatId, jwt }) {
  const { connected, messages, sendMessage } = useChatWs({ jwt, chatId });
  const [text, setText] = useState("");

  const onSend = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (sendMessage(t)) setText("");
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Chat #{chatId}</h1>
        <span className={connected ? "text-green-600" : "text-gray-500"}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>

      <div className="border rounded-lg p-3 h-80 overflow-auto space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="font-medium">{m.sender?.name || m.sender?._id}</div>
            <div>{m.text}</div>
            <div className="text-xs text-gray-500">
              {new Date(m.createdAt).toLocaleTimeString()}
            </div>
            <hr className="opacity-10" />
          </div>
        ))}
        {messages.length === 0 && <div className="text-gray-500">No messages yet.</div>}
      </div>

      <form onSubmit={onSend} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="border rounded px-4 py-2" type="submit">Send</button>
      </form>
    </div>
  );
}
```

### Page `page.jsx`

```jsx
import ChatClient from "./ChatClient";

// ⚠️ Adaptez à votre gestion d’auth (cookies / NextAuth / etc.)
async function getJwt() {
  return ""; // Fournissez ici le JWT du user connecté
}

export default async function ChatPage({ params }) {
  const jwt = await getJwt();
  return <ChatClient chatId={params.chatId} jwt={jwt} />;
}
```

---

## 🚀 Procédure de test

1. **Créer 2 comptes** via `/api/auth/register` (Alice & Bob).  
2. **Ensure chat** (JWT d’Alice + `peerId` de Bob) → récupérez `chat.id`.  
3. Ouvrez `/chat/<chat.id>` côté front.  
4. Tapez un message → visible en temps réel chez l’autre utilisateur connecté au même `chatId`.  
5. Vérifiez l’historique via `GET /api/chat/:id/messages`.

---

## 🛠️ Dépannage

- **401/403** → Vérifiez le JWT (`Authorization: Bearer <JWT>`) et que l’utilisateur est bien membre du chat.  
- **Pas de temps réel** → Vérifiez l’URL WS (`?token=<JWT>`), l’envoi du `join`, et la config proxy WS.  
- **Pas d’historique** → Envoyez un premier message puis relancez `GET /api/chat/:id/messages`.

---

Bon dev 💫
