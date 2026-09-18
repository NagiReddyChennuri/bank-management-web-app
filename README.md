# 🏛️ Apex Digital Bank — Modern Online Banking Platform

A modern, cloud-native full-stack Online Banking & Financial Management Web Application built with **Node.js**, **Express.js**, **MongoDB Atlas (Mongoose)**, and a **Vanilla JavaScript / Modern CSS3** frontend.

Designed with a high-conversion public **Landing Page** and an **Isolated Private Customer Banking Portal** with strict 4-digit PIN authorization, instant fund transfers, and real-time passbook statements.

---

## 🌟 Key Features

### 1. 🎨 Modern Public Landing Page
- **Hero Section**: High-converting hero banner, financial trust badges, and quick CTA buttons (*Sign In* & *Open Account*).
- **Features Showcase**: Highlights PIN-protected security, zero maintenance fees, instant settlements, and 24/7 cloud persistence.
- **Privacy & Security Guarantee**: Details the bank-grade isolation and customer data encryption.

### 2. 🔐 Private Customer Banking Portal
- **Account Isolation**: Customers only see their own balance, account details, and transaction history.
- **PIN-Protected Security**: Mandatory 4-digit security PIN verification required for all transactions, deposits, withdrawals, and profile edits.
- **Interactive Balance Card**: Real-time balance display with Indian Rupee (INR ₹) formatting and an eye toggle (👁️) to show/hide balance for privacy.
- **Instant Fund Transfers**: Transfer money directly to another customer's Account Number with instant balance settlement for both sender and recipient.
- **Deposits & Withdrawals**: Instant deposits and withdrawals with real-time balance validation and overdraft protection.
- **Live Passbook & Statement**: Detailed transaction log showing date, transaction type, custom reference notes, and color-coded amounts (`+₹` green for credit, `-₹` red for debit).
- **Profile & PIN Management**: Customers can update their profile information or change their 4-digit PIN securely.

### 3. ☁️ Cloud Database & Serverless Ready
- **MongoDB Atlas**: Fully persistent cloud database ensuring data is retained permanently across device restarts, browser refreshes, and serverless cold starts.
- **Serverless Optimized**: Configured with global Mongoose connection pooling for instantaneous response times on Vercel and Render.
- **Mobile Responsive**: Fully optimized layout that works seamlessly across smartphones, tablets, and desktop browsers.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Plus Jakarta Sans, Glassmorphism, Micro-animations), Vanilla JavaScript (ES6+ `fetch`) |
| **Backend** | Node.js, Express.js (RESTful API Architecture) |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **Environment** | `dotenv` configuration |
| **Deployment** | Vercel (Serverless Functions via `vercel.json`) / Render / Railway |

---

## 📁 Project Structure

```text
├── api/
│   └── index.js             # Vercel Serverless Function entry point
├── public/
│   ├── css/
│   │   └── style.css        # Custom fintech design system & responsive styling
│   ├── js/
│   │   └── main.js          # Client-side session management & API handlers
│   └── index.html           # Landing page & private customer dashboard
├── src/
│   ├── config/
│   │   └── db.js            # MongoDB Atlas connection & serverless connection pool
│   ├── models/
│   │   ├── Account.js       # Mongoose Account schema (account_number, pin, balance...)
│   │   └── Transaction.js   # Mongoose Transaction schema (type, amount, note...)
│   ├── routes/
│   │   ├── accounts.js      # Customer authentication, registration, & profile routes
│   │   ├── transactions.js  # Deposit, withdrawal, transfer, & passbook routes
│   │   ├── analytics.js     # Bank-wide financial aggregation pipelines
│   │   └── api.js           # Server health check endpoint
│   └── server.js            # Main Express application & middleware setup
├── .env.example             # Template for environment variables
├── package.json             # Project dependencies & scripts
├── vercel.json              # Vercel routing and serverless configuration
└── README.md                # Project documentation
```

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/NagiReddyChennuri/bank-management-web-app.git
cd bank-management-web-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/bank_app?retryWrites=true&w=majority
PORT=3000
```

### 4. Start the Application
```bash
npm start
```
Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 🌐 Cloud Deployment

### Deploy to Vercel (Recommended)
1. Import this repository into [Vercel](https://vercel.com).
2. Under **Project Settings ➔ Environment Variables**, add:
   - **Key:** `MONGODB_URI`
   - **Value:** Your MongoDB Atlas connection string.
3. Click **Deploy**. Vercel will build both the static frontend and serverless API automatically.

### Deploy to Render
1. Create a new **Web Service** in [Render](https://render.com) connected to this repository.
2. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add `MONGODB_URI` under **Environment Variables**.
4. Click **Deploy Web Service**.

---

## 📡 API Reference

### Account Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/accounts/login` | Authenticate customer with Account #/Email & 4-digit PIN |
| `POST` | `/api/accounts` | Open a new bank account with initial deposit |
| `GET` | `/api/accounts/me/:accountNumber` | Get private details of logged-in account |
| `PUT` | `/api/accounts/:accountNumber` | Update profile details / PIN (requires current PIN) |
| `DELETE` | `/api/accounts/:accountNumber` | Close account (requires PIN) |
| `POST` | `/api/accounts/clear-all-data` | Utility endpoint to wipe test database records |

### Transaction Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/transactions/deposit` | Deposit funds (requires PIN) |
| `POST` | `/api/transactions/withdraw` | Withdraw funds (requires PIN & balance check) |
| `POST` | `/api/transactions/transfer` | Instant internal fund transfer to another account |
| `GET` | `/api/transactions/:accountNumber` | Retrieve passbook statement for an account |

---

## 📄 License
This project is open source and available under the [ISC License](LICENSE).
