# ShopStack — Full-stack E-commerce Starter

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: bcryptjs + JWT
- Payment: Razorpay order creation and signature verification (requires Razorpay test keys)

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas connection string
- Razorpay test account credentials to test checkout

## 1. Configure the backend
```bash
cd server
copy .env.example .env
npm install
```
Edit `server/.env` with your MongoDB URI, JWT secret, and (optionally) Razorpay test keys.

## 2. Seed demo products
With MongoDB running and the backend configured:
```bash
npm run seed
npm run dev
```
Backend runs at http://localhost:5000.

## 3. Run the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Demo flow
- Browse/search/filter products and add them to cart.
- Register or log in.
- Checkout requires login.
- Without Razorpay keys, checkout can create a demo order marked `payment_pending`; it does NOT charge a customer.
- With Razorpay test keys and the Razorpay Checkout script loaded, use test credentials from Razorpay's official documentation.
- The server verifies Razorpay's signature before marking an order paid.

## Security notes before production
This is a learning starter, not a production-ready store. Before deployment, add rate limiting, email verification, password reset, robust request validation, CSRF protections where applicable, inventory reservation/locking, shipping/tax rules, audit logging, monitoring, and tests. Keep secrets only in server environment variables. Never trust prices or payment status supplied by the browser. Use HTTPS in production.
