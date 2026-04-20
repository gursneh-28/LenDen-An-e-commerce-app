# LenDen — Campus E-Commerce App

> A peer-to-peer marketplace exclusively for Indian college students to **buy, sell, and rent** items within their own organization/campus. Built with **React Native (Expo)** on the frontend and **Node.js + Express + MongoDB** on the backend.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Frontend — Screen by Screen](#frontend--screen-by-screen)
- [Backend — File by File](#backend--file-by-file)
- [API Reference](#api-reference)
- [Key Features](#key-features)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

LenDen is a college-only marketplace. Only students with verified **`.edu.in` / `.ac.in`** institutional email addresses can register. Users can:

- List items for **sale** or **rent**
- Browse and search listings from their campus
- Add items to a **wishlist**
- Place **orders** (buy or book a rental)
- **Chat** in real-time with sellers/buyers via Socket.io
- Post and respond to **service requests**
- Manage all their activity from a unified **Profile** page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.81, Expo ~54, Expo Router ~6 |
| Navigation | Expo Router (file-based routing) |
| State | React `useState` / `useCallback` / `useMemo` |
| Real-time Chat | Socket.io client ↔ Socket.io server |
| Backend | Node.js, Express 4 |
| Database | MongoDB (native driver — no Mongoose ODM) |
| Auth | JWT (7-day expiry) + OTP via Gmail/Nodemailer |
| Image Hosting | Cloudinary |
| Payments | Razorpay |
| Deployment | Render (backend), Expo Go / EAS (frontend) |

---

## Project Structure

```
LenDen-An-e-commerce-app/
│
├── app/                          # All screens (Expo Router file-based)
│   ├── index.jsx                 # Entry redirect → /login
│   ├── itemDetail.jsx            # Product detail page
│   ├── wishlist.jsx              # Standalone wishlist screen
│   ├── chat.jsx                  # Individual chat conversation screen
│   ├── inbox.jsx                 # Chat inbox (all conversations)
│   │
│   ├── (auth)/                   # Auth group (no tab bar)
│   │   ├── login.jsx             # Login screen
│   │   └── signup.jsx            # Sign-up + OTP verification screen
│   │
│   └── (tabs)/                   # Main app (tab bar visible)
│       ├── _layout.jsx           # Tab navigator configuration
│       ├── home.jsx              # Home feed — browse all listings
│       ├── upload.jsx            # Upload a listing (sell or rent)
│       ├── request.jsx           # Service requests board
│       ├── help.jsx              # Help / FAQ screen
│       └── profile.jsx           # User profile, orders, wishlist modal
│
├── services/
│   └── api.js                    # All API calls + LOCAL_MODE toggle
│
├── backend/
│   ├── server.js                 # Express app, Socket.io, route mounting
│   ├── .env                      # Environment variables (not committed)
│   │
│   ├── config/
│   │   ├── db.js                 # MongoDB connection + helper functions
│   │   └── cloudinary.js         # Cloudinary SDK config
│   │
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification middleware
│   │
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── itemRoutes.js         # /api/items/*
│   │   ├── requestRoutes.js      # /api/requests/*
│   │   ├── orderRoutes.js        # /api/orders/*
│   │   ├── userRoutes.js         # /api/user/* (wishlist)
│   │   └── chatRoutes.js         # /api/chat/*
│   │
│   ├── controllers/
│   │   ├── authController.js     # OTP send/verify, login logic
│   │   ├── itemController.js     # CRUD for listings
│   │   ├── requestController.js  # CRUD for service requests
│   │   ├── orderController.js    # Order creation and status updates
│   │   ├── userController.js     # Wishlist get/toggle
│   │   └── chatController.js     # Chat conversations and messages
│   │
│   └── models/
│       ├── userModel.js          # User CRUD + wishlist operations
│       ├── itemModel.js          # Item CRUD
│       ├── requestModel.js       # Request CRUD
│       ├── orderModel.js         # Order CRUD
│       └── chatModel.js          # Message + conversation CRUD
│
├── assets/                       # Images, fonts, icons
├── package.json                  # Frontend dependencies
└── README.md                     # This file
```

---

## Frontend — Screen by Screen

### `app/index.jsx`
**Entry point.** Immediately redirects to `/login` using `<Redirect>`. No UI rendered.

---

### `app/(auth)/login.jsx`
**Login screen.**
- Accepts email + password
- Calls `POST /api/auth/login`
- On success: saves JWT token and user object to `AsyncStorage`, then navigates to `/(tabs)/home`

---

### `app/(auth)/signup.jsx`
**Two-step registration screen.**
- **Step 1:** User enters email → app calls `POST /api/auth/send-otp` → backend validates domain against allowed college list and emails a 6-digit OTP
- **Step 2:** User enters username, password, and OTP → app calls `POST /api/auth/verify-otp` → backend creates account
- Enforces `.edu.in` / `.ac.in` email domains (and 100+ whitelisted college domains)

---

### `app/(tabs)/_layout.jsx`
**Tab bar configuration.** Defines 5 visible tabs: Home, Request, Upload, Help, Profile. Auth routes (`login`, `signup`) are hidden from the tab bar via `href: null`.

---

### `app/(tabs)/home.jsx`
**Main marketplace feed.**

| Function | Purpose |
|---|---|
| `fetchItems()` | Loads all listings from `GET /api/items/all` |
| `fetchWishlist()` | Loads user's wishlisted item IDs from backend |
| `fetchUnread()` | Gets unread message count for inbox badge |
| `handleSearch(text)` | Filters displayed items by name/description/seller |
| `handleCategory(key)` | Filters by category (all / sell / rent / electronics / etc.) |
| `toggleWishlist(id)` | Optimistically adds/removes from wishlist, syncs with backend |
| `openItem(item)` | Navigates to `/itemDetail` passing full item as JSON param |
| `renderCard({ item })` | Renders a product card with image, price, type badge, heart button |
| `timeAgo(iso)` | Formats timestamp as "2h ago", "3d ago" etc. |

---

### `app/(tabs)/upload.jsx`
**List a new item for sale or rent.**
- Pick images from device gallery (with cropping via `expo-image-manipulator`)
- Choose type: Sell or Rent
- If Rent: set availability date ranges
- Uploads image to Cloudinary, saves item to DB via `POST /api/items/upload`

---

### `app/(tabs)/request.jsx`
**Service requests board.**
- Displays all open requests from the same campus org
- Users can post new requests (work description + budget)
- Each request can be contacted via chat
- Calls `GET /api/requests/all` and `POST /api/requests/create`

---

### `app/(tabs)/help.jsx`
**Help & FAQ screen.**
- Categorized help articles
- Search functionality across all help topics
- Static content, no API calls

---

### `app/(tabs)/profile.jsx`
**Unified profile screen. Most complex screen in the app.**

| Component / Function | Purpose |
|---|---|
| `WishlistModal` | Bottom-sheet modal showing all wishlisted items. Empty state has "Browse listings" button |
| `EditItemModal` | Modal to edit name/description/price of an existing listing |
| `EditRequestModal` | Modal to edit work/price of a posted request |
| `SellingTab` | Shows user's listings + incoming orders with confirm/decline/complete actions |
| `BuyingTab` | Shows user's placed orders (active + history) |
| `RequestsTab` | Shows user's posted service requests |
| `EmptyState` | Reusable empty placeholder with optional action button |
| `fetchAll()` | Loads user info, all items, my items, my requests, my orders, incoming orders, wishlist in parallel |
| `handleWishlistToggle(id)` | Optimistically toggles wishlist state |
| `handleDelete(id, type)` | Confirms and deletes a listing or request |
| `handleOrderAction(id, status)` | Updates order status (confirmed/cancelled/completed) |
| `handleLogout()` | Clears AsyncStorage session, redirects to login |

---

### `app/itemDetail.jsx`
**Full product detail page.**

| Function | Purpose |
|---|---|
| `item` (useMemo) | Parses `params.item` JSON exactly once using `useMemo` — prevents re-render loop |
| `checkWishlistStatus()` | On mount, fetches wishlist and sets heart icon state |
| `toggleWishlist()` | Adds/removes item from wishlist with optimistic UI |
| `handleChat()` | Creates/opens a chat conversation room with the seller |
| `handleBuy()` | Navigates to checkout with item + order type |

> **Bug fixed:** Previously `item` was parsed on every render (no `useMemo`), which caused `useEffect([item])` to fire infinitely → infinite API calls → screen blinking.

---

### `app/wishlist.jsx`
**Standalone wishlist screen** (accessed via Back navigation from itemDetail or directly).
- Loads wishlist IDs from backend, then filters all items
- Falls back to `AsyncStorage` if backend is unreachable
- `removeItem(id)` — toggles item off wishlist in backend + updates local state
- `browseListings()` — navigates to `/(tabs)/home`

---

### `app/inbox.jsx`
**Chat inbox.** Lists all conversations the user is part of. Shows last message, timestamp, unread count. Navigates to `/chat` on tap.

---

### `app/chat.jsx`
**Real-time chat screen.**
- Connects to Socket.io server on mount
- Joins a room identified by `roomId` (format: `item_{itemId}_{emailA}_{emailB}`)
- Sends messages via `send_message` socket event
- Receives messages via `new_message` socket event
- Shows context card (the item/request being discussed) at the top

---

### `services/api.js`
**Central API service.** All backend communication goes through here.

```js
// ── Toggle for local vs. Render backend ──
const LOCAL_MODE = false; // true = local port 5000, false = Render
const LOCAL_IP   = "172.16.61.155"; // your PC's LAN IP
```

| Export | Purpose |
|---|---|
| `authAPI.sendOtp(data)` | Send OTP to email |
| `authAPI.verifyOtpAndSignup(data)` | Verify OTP and create account |
| `authAPI.login(data)` | Login with email/password |
| `itemAPI.uploadItem(formData)` | Upload a new listing (multipart) |
| `itemAPI.getItems()` | Get all listings |
| `itemAPI.getMyItems()` | Get current user's listings |
| `itemAPI.updateItem(id, data)` | Edit a listing |
| `itemAPI.deleteItem(id)` | Delete a listing |
| `requestAPI.*` | Full CRUD for service requests |
| `orderAPI.createOrder(d)` | Place an order |
| `orderAPI.getMyOrders()` | Get orders placed by user |
| `orderAPI.getSellingOrders()` | Get incoming orders for user's items |
| `orderAPI.updateStatus(id, status)` | Update order status |
| `paymentAPI.createRazorpayOrder(d)` | Create Razorpay payment |
| `paymentAPI.verifyPayment(d)` | Verify Razorpay payment signature |
| `userAPI.getWishlist()` | Fetch wishlist item IDs |
| `userAPI.toggleWishlist(itemId)` | Add/remove item from wishlist |
| `chatAPI.*` | Chat conversations and messages |
| `itemRoomId(...)` | Generate a deterministic room ID for item chats |
| `requestRoomId(...)` | Generate a room ID for request chats |
| `saveToken / saveUser / getUser / clearSession` | AsyncStorage helpers |

---

## Backend — File by File

### `backend/server.js`
**App entry point.** Initializes Express, connects to MongoDB, sets up Socket.io, and mounts all routes.

```
Routes mounted:
  /api/auth     → authRoutes
  /api/items    → itemRoutes
  /api/requests → requestRoutes
  /api/orders   → orderRoutes
  /api/chat     → chatRoutes
  /api/user     → userRoutes  ← wishlist
```

**Socket.io events:**
| Event | Direction | Purpose |
|---|---|---|
| `join_room` | client → server | Join a chat room |
| `send_message` | client → server | Send a chat message |
| `new_message` | server → client | Broadcast message to room |
| `leave_room` | client → server | Leave a chat room |

---

### `backend/config/db.js`
**MongoDB connection manager.**

| Function | Purpose |
|---|---|
| `connect()` | Opens MongoDB connection, pings DB to verify |
| `getDb()` | Returns the active DB instance (throws if not connected) |
| `getCollection(name)` | Shorthand to get a named collection |
| `close()` | Gracefully closes the connection |

---

### `backend/config/cloudinary.js`
Configures Cloudinary SDK with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` from `.env`.

---

### `backend/middleware/authMiddleware.js`
**JWT verification middleware.** Reads `Authorization: Bearer <token>` header, verifies with `JWT_SECRET`, attaches decoded payload to `req.user`. Rejects with 401 if missing or invalid.

---

### `backend/controllers/authController.js`
**Authentication logic.**

| Method | Route | Purpose |
|---|---|---|
| `sendOtp` | POST `/api/auth/send-otp` | Validates email domain against 100+ college domains, generates 6-digit OTP, stores in memory Map with 10-min expiry, emails it via Nodemailer |
| `verifyOtpAndSignup` | POST `/api/auth/verify-otp` | Validates OTP, hashes password with bcrypt, creates user in DB |
| `login` | POST `/api/auth/login` | Verifies password, issues JWT valid for 7 days |

> OTPs are stored in an **in-memory Map** (`otpStore`). This resets on server restart. For production, use Redis.

---

### `backend/controllers/itemController.js`
**Item (listing) CRUD.**

| Method | Route | Purpose |
|---|---|---|
| `uploadItem` | POST `/api/items/upload` | Accepts multipart form, uploads image to Cloudinary, saves item to DB |
| `getItems` | GET `/api/items/all` | Returns all items (filtered by org if needed) |
| `getMyItems` | GET `/api/items/mine` | Returns only current user's items |
| `updateItem` | PUT `/api/items/:id` | Updates name/description/price |
| `deleteItem` | DELETE `/api/items/:id` | Removes listing |

---

### `backend/controllers/requestController.js`
**Service request CRUD** (same pattern as items — create, getAll, getMine, update, delete).

---

### `backend/controllers/orderController.js`
**Order management.**

| Method | Route | Purpose |
|---|---|---|
| `createOrder` | POST `/api/orders/create` | Creates a buy/rent order, links to item and seller |
| `getMyOrders` | GET `/api/orders/mine` | Orders placed BY the current user |
| `getSellingOrders` | GET `/api/orders/selling` | Orders placed ON the current user's items |
| `updateStatus` | PATCH `/api/orders/:id/status` | Changes order to: `pending → confirmed → completed / cancelled` |

---

### `backend/controllers/userController.js`
**Wishlist management.**

| Method | Route | Purpose |
|---|---|---|
| `getWishlist` | GET `/api/user/wishlist` | Returns array of wishlisted item ID strings |
| `toggleWishlist` | POST `/api/user/wishlist/toggle` | Adds item if not present, removes if present. Returns updated wishlist |

---

### `backend/controllers/chatController.js`
**Chat REST endpoints** (Socket.io handles real-time; REST handles history fetch on load).

| Method | Route | Purpose |
|---|---|---|
| `getOrCreate` | POST `/api/chat/conversation` | Get or create a conversation record |
| `getConversations` | GET `/api/chat/conversations` | Inbox: all conversations for current user |
| `getMessages` | GET `/api/chat/messages/:id` | Message history for a conversation |
| `sendMessage` | POST `/api/chat/messages` | Save a message (fallback; real-time uses Socket.io) |
| `getUnread` | GET `/api/chat/unread` | Count of unread messages across all conversations |

---

### `backend/models/userModel.js`
**MongoDB operations on `users` collection.**

| Function | Purpose |
|---|---|
| `createUser(data)` | Insert new user document |
| `findByEmail(email)` | Look up user by email |
| `findByUsername(username)` | Look up user by username |
| `findById(id)` | Look up user by MongoDB ObjectId |
| `getWishlist(userId)` | Returns wishlist array, normalized to strings |
| `toggleWishlist(userId, itemId)` | Adds/removes itemId (stored as string) using `$addToSet` / `$pullAll`. Normalizes all IDs to strings to prevent ObjectId/string type mismatch |

> **Bug fixed:** Wishlist IDs were stored as BSON ObjectIds in some cases and strings in others, causing `includes()` comparisons to silently fail. All IDs are now normalized to plain strings.

---

### `backend/models/itemModel.js`
MongoDB operations on `items` collection — insert, findAll (with org filter), findByUploader, findById, update, delete.

---

### `backend/models/requestModel.js`
MongoDB operations on `requests` collection — same CRUD pattern as items.

---

### `backend/models/orderModel.js`
MongoDB operations on `orders` collection — create, find by buyer, find by seller, update status.

---

### `backend/models/chatModel.js`
MongoDB operations on `messages` and `conversations` collections — saveMessage, getMessages, upsertConversation, getConversations, markRead, getUnreadCount.

---

## API Reference

```
Auth:
  POST   /api/auth/send-otp        → Send OTP to college email
  POST   /api/auth/verify-otp      → Verify OTP + create account
  POST   /api/auth/login           → Login, receive JWT

Items:
  POST   /api/items/upload         → Upload new listing  [auth]
  GET    /api/items/all            → All listings
  GET    /api/items/mine           → My listings         [auth]
  PUT    /api/items/:id            → Edit listing        [auth]
  DELETE /api/items/:id            → Delete listing      [auth]

Requests:
  POST   /api/requests/create      → Post service request [auth]
  GET    /api/requests/all         → All requests
  GET    /api/requests/mine        → My requests          [auth]
  PUT    /api/requests/:id         → Edit request         [auth]
  DELETE /api/requests/:id         → Delete request       [auth]

Orders:
  POST   /api/orders/create        → Place order          [auth]
  GET    /api/orders/mine          → My placed orders     [auth]
  GET    /api/orders/selling       → Incoming orders      [auth]
  PATCH  /api/orders/:id/status    → Update status        [auth]

User / Wishlist:
  GET    /api/user/wishlist        → Get wishlist IDs     [auth]
  POST   /api/user/wishlist/toggle → Toggle wishlist item [auth]

Payments:
  POST   /api/payments/create-order → Create Razorpay order [auth]
  POST   /api/payments/verify       → Verify payment        [auth]

Chat:
  POST   /api/chat/conversation    → Get or create conv   [auth]
  GET    /api/chat/conversations   → All conversations    [auth]
  GET    /api/chat/messages/:id    → Message history      [auth]
  POST   /api/chat/messages        → Send message         [auth]
  GET    /api/chat/unread          → Unread count         [auth]
```

---

## Key Features

- **College-only access** — 100+ whitelisted `.ac.in` / `.edu.in` email domains
- **OTP email verification** on signup via Nodemailer + Gmail
- **JWT auth** with 7-day token, stored in `AsyncStorage`
- **Org-scoped** — users only see listings from their own college domain
- **Real-time chat** via Socket.io with persistent message history
- **Wishlist** — add/remove items with optimistic UI, synced to backend
- **Dual listing types** — Sell (one-time) or Rent (with availability date ranges)
- **Image upload** — native image picker + Cloudinary hosting
- **Order management** — full lifecycle: pending → confirmed → completed/cancelled
- **Razorpay** payment integration

---

## Running Locally

### Backend

```bash
cd backend
npm install
# create .env (see Environment Variables below)
npm run dev          # nodemon with hot reload
# OR
npm start            # plain node
```

Server runs on `http://localhost:5000`

### Frontend

```bash
# In root directory
npm install
npx expo start
```

> **To connect frontend to local backend**, open `services/api.js` and set:
> ```js
> const LOCAL_MODE = true;
> const LOCAL_IP   = "YOUR_PC_LAN_IP"; // run `ipconfig` on Windows
> ```
> Use your **LAN IP** (not `localhost`) because Expo runs on a physical device/emulator.
>
> Set `LOCAL_MODE = false` to use the live Render backend.

---

## Environment Variables

### `backend/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/<dbname>
JWT_SECRET=your_jwt_secret_key

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password      # Gmail App Password, not login password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## Deployment

| Service | What's deployed |
|---|---|
| **Render** | Node.js backend (`backend/` folder). Auto-deploys on `git push` to `main` |
| **Expo Go / EAS** | React Native frontend. `npx expo start` for development |

**Backend live URL:** `https://lenden-an-e-commerce-app.onrender.com`

> ⚠️ Render free tier **spins down** after 15 minutes of inactivity. First request after sleep may take 30–60 seconds.

---

## Known Issues & Notes

- OTP store is **in-memory** — resets on server restart. Fine for development; use Redis for production.
- Render free tier cold-start delay (~30–60s) may cause the app to appear unresponsive on first load.
- The `[Layout children]: No route named "login"` warnings in Expo are harmless — auth routes live in the `(auth)` group, which the tab layout doesn't manage.
