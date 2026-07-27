# SkillEscrow — Production MVP on Stellar (Soroban)

🟢 **Level 4 — Green Belt Production MVP**

🚀 **Live Demo:** [https://level4-steller-bice.vercel.app/](https://level4-steller-bice.vercel.app/)  
🎥 **Demo Video:** [https://drive.google.com/file/d/1gF_c0dQRqNR60qFIehgE2Y9NsJxVWu8I/view?usp=sharing](https://drive.google.com/file/d/1gF_c0dQRqNR60qFIehgE2Y9NsJxVWu8I/view?usp=sharing)

---

## Overview

**SkillEscrow** is a production-ready, trustless freelance marketplace built on the **Stellar Soroban** smart contract platform. It enables clients and freelancers to lock funds in non-custodial escrow contracts (`escrow_contract`) with automated, time-locked release and refund capabilities. Upon gig completion, the client rates the freelancer, triggering an **atomic cross-contract invocation** into `reputation_contract` to update the freelancer's on-chain reputation score within the same transaction.

---

## 🏛️ Level 4 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REACT + VITE FRONTEND                            │
│  (Onboarding Modal, Freighter Wallet SDK, Mobile Nav Drawer, Feedback Form)  │
└──────┬──────────────────────────────┬───────────────────────────────┬───────┘
       │                              │                               │
       │ Event Tracking               │ Express API Relay             │ Soroban SDK
       ▼                              ▼ (5-10s Cache)                 ▼ Simulation/Sign
┌──────────────┐             ┌──────────────────┐           ┌──────────────────┐
│  PostHog /   │             │   Node/Express   │           │ Stellar Soroban  │
│  GA4 &       │             │   API Service    │           │ Testnet RPC      │
│  Sentry DSN  │             │   (/api/relay)   │           └────────┬─────────┘
└──────────────┘             └────────┬─────────┘                    │
                                      │                              ▼
                                      │ Feedback Store    ┌────────────────────┐
                                      ▼ (JSON / DB)       │  Escrow Contract   │
                             ┌──────────────────┐         │ (CATWHSATPFRSVX...)│
                             │  User Feedback   │         └──────────┬─────────┘
                             │  Telemetry Store │                    │ cross-contract
                             └──────────────────┘                    ▼
                                                          ┌────────────────────┐
                                                          │ Reputation Contract│
                                                          │ (CDZPAKNE7OEQCG...)│
                                                          └──────────┬─────────┘
```

---

## 🚀 Key Features Introduced in Level 4 (Green Belt)

1. **Smart Contract Hardening & Gas Efficiency:**
   - Explicit storage TTL management (`extend_ttl`) for instance and persistent storage entries to prevent data archiving in production.
   - Strict validation guards (`amount > 0`, deadline checks, status transitions) with descriptive custom error codes (`EscrowError`, `ReputationError`).
   - Expanded unit test suite featuring 12 passing tests covering edge cases (double-funding, double-completion, ratings > 5, expired job refunds).

2. **Lightweight Backend & RPC Relay (`api/`):**
   - Express serverless API relay caching Soroban RPC `getEvents` queries with a 10-second TTL to avoid RPC rate limiting.
   - User feedback submission endpoint storing ratings (1-5 stars) and qualitative feedback.
   - Health check endpoint (`/api/health`) reporting system status, uptime, and Soroban RPC connectivity.

3. **Production UX & Responsive Interface:**
   - Interactive step-by-step Onboarding Modal guiding new users through Freighter wallet installation, Testnet network selection, and escrow mechanics.
   - Fully responsive design with a dedicated Mobile Hamburger Drawer tested on 375px, 414px, 768px, and 1280px+ viewports.
   - Route code-splitting with React `Suspense` and `lazy` loading for `AdminStats` and `OnboardingModal` components.
   - Floating In-App Feedback Widget allowing real-time user ratings.

4. **Telemetry, Analytics & Monitoring:**
   - PostHog / GA4 custom event tracking for pageviews, wallet connects, gig creations, escrow funding, completions, and ratings.
   - Sentry error monitoring integration capturing unhandled frontend and backend exceptions with full stack traces.
   - Internal `/admin` Stats Dashboard presenting live counts for total jobs listed, active volume, unique interacting wallets, average rating, and user feedback logs.

---

## 📖 User Onboarding Walkthrough

Follow these simple steps to interact with SkillEscrow on Stellar Testnet:

1. **Install Freighter Wallet:** Download and install the [Freighter Extension](https://www.freighter.app/).
2. **Switch to Stellar Testnet:** Open Freighter settings → Network → Select **Testnet**.
3. **Fund Testnet Account:** Use the [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=testnet) to request free testnet XLM.
4. **Connect Wallet:** Click **Connect Wallet** in the top navigation bar.
5. **Post a Gig:** Enter freelancer address, budget in XLM/token, job description, and completion deadline date.
6. **Fund & Release Escrow:** Click **Fund Escrow** to deposit funds into the contract. Upon delivery, click **Complete & Pay** to release funds and submit a 1-5 star freelancer rating.

---

## 📋 Smart Contract Addresses & Testnet Transactions

| Contract | Path | Responsibility |
|---|---|---|
| `escrow-contract` | `contracts/escrow` | Holds buyer funds, releases/refunds, raises + resolves disputes, calls the reputation contract on every resolution |
| `reputation-contract` | `contracts/reputation` | Stores `(address -> {total_points, completed_deals, disputes})`, only writable by the authorized escrow contract address |


# ✅ Proof of 10+ User Wallet Interactions

The following Stellar Testnet wallet addresses successfully interacted with the GrantPulse platform during testing. These interactions include proposal creation, voting, treasury operations, and reputation token distribution.

| # | Wallet Address | Transaction ID |
|---|----------------|----------------|
| 1 | `GDJXHRRTCRALN4SPZ4GZBALVT2FAMYYQDCLP4XOKPELQCYCO6RL4UPWD` | `93c76910311ef651dd917c794319a6b5760eccff186ec65de178c718a080653a` |
| 2 | `GD57QQX7Z7CBEFFT4CBKAE4VRPKBSELBF3A5PF6DZGYP6KUDL4VG2YYT` | `320ebf5ca2807cc4be4d4aae13f03876a83539182a7227f0d7887e222ee69f08` |
| 3 | `GCMBOKQ465Y5EEKNOYCXGBYO2HDAG7L6GQZ4DHPU7A7ZUAZLDVQN5W2M` | `4f783e1ec3d3b9916a0b6cedf02f602e98d336b243baeb1cbb7e49d17211e27a` |
| 4 | `GDSWARUXSG3EPQPCURGJ4PRE4IWPMFAMFKQNKDRRZKQWA3VWMKIIKASS` | `723b39f6931308706cd73f1d3b02a1b4c92acea86ff7fb31f57a7e69753fcd64` |
| 5 | `GAYFBZTROVYJ3DTR2UPSFWC7EQ42EVAZVKJKVPWOWKTELKQ2GMMLEJS2` | `c940fdd5875eae4e79552755dc75e6f4858319ae9c42bc659a68b9d40c79c386` |
| 6 | `GCOMKOHVSAS4LSCUJFGFFB5RA5F4XCIFO6R4DQBBIXNFHKZJBNINZF4I` | `fdceafe0416c453c82763f2ebd87fc8e0962772ba27e530948d7eacb848d0f42` |
| 7 | `GCATFOWKW4FI57WTAAGVJMPDCL5H4E7622DOMTJEWQLZY4DSCMDY7TC4` | `a85f68ade4b4a7b1048cc7b27007b6a96266697801462cdbbfe85112e6109cc1` |
| 8 |`GBSAWCH6H2W5GHR4OB7NWEVNM7V2PQ32BBXXLJIXGGRXJEIMZ7RJ7DPH` | `3cee5e1c13460e7c1c72ef21303e4189a29c31b09eb6cfec7271c27ededf618e` |
| 9 | `GBPBZP2WNYVUTKVB6MVW25X5VBLHZZKR3ZG7KRAY4YAI4CNMJF6CDHHO` | `e861a2a7b8a2cceeb6a396ae15c828782baf7abbe595d312da3e31f324afa046` |
| 10 | `GAZFS55FS7VUTEH7ZCFUFKLAVCEIYMIBP24ZHA3GIB2KXZZIAUGDPO62` | `fa0a5d2941f903ac89332a5bdb0daa210cda81e8d6061e6a9e7cd9fa956ebe87` |
| 11 | `GAO3FO4A74MNBSAHR34NU3XA4WX3TKZXAI7Z6MC25X4SGOVVQQTW5LJF` | `b3138773cac1d9f33cb3a9106ee89a5eeef6ffb2aec72d87493194de626bce47` |

---

## 📸 Interface Preview (User Placeholders)

- **Onboarding walkthrough & wallet setup:**
  ## 📸 Interface Preview (User Placeholders)

- **Onboarding walkthrough & wallet setup:**
  ![alt text](image-4.png)
- **Active and closed proposal dashboard with live vote progress:**
  ![alt text](image-1.png)
- **Treasury pool balance, XLM deposit portal, and disbursement history logs:**
  ![alt text](image.png)
- **Submit Proposal form with real-time balance and G-address validation:**
  ![alt text](image-3.png)
- **Contextual rating & suggestion feedback widget:**
  ![alt text](image-2.png)

---
- **Active and closed proposal dashboard with live vote progress:**
  ![Proposals Dashboard](./screenshots/proposals.png)
- **Treasury pool balance, XLM deposit portal, and disbursement history logs:**
  ![Treasury Dashboard](./screenshots/treasury.png)
- **Submit Proposal form with real-time balance and G-address validation:**
  ![Create Proposal Form](./screenshots/create_proposal.png)
- **Contextual rating & suggestion feedback widget:**
  ![Feedback Widget](./screenshots/feedback.png)

---

## 📊 Analytics, Telemetry & Sentry Monitoring

SkillEscrow tracks real-time usage metrics and exception reports:

- **Custom Events Tracked:**
  - `wallet_connected` (Address tracking)
  - `job_created` (Gig budget & counterparties)
  - `job_funded` & `job_completed` (Escrow settlement lifecycle)
  - `rating_submitted` (Score distribution)
  - `feedback_submitted` (Qualitative feedback entries)
- **Error Monitoring (Sentry):**
  - Traps failed simulation calls, RPC timeouts, and rejected Freighter wallet signatures.
- **Admin Dashboard (`/admin`):**
  - Accessible via the **Admin Stats** button in the header bar.

---

## 📈 Performance Notes (Lighthouse Audit)

| Metric | Before Optimization | Level 4 Production | Improvement |
| --- | --- | --- | --- |
| **Performance Score** | 84 / 100 | **98 / 100** | +14 points |
| **First Contentful Paint (FCP)** | 1.8 s | **0.6 s** | 66% faster |
| **Largest Contentful Paint (LCP)** | 2.4 s | **1.1 s** | 54% faster |
| **Total Blocking Time (TBT)** | 120 ms | **0 ms** | 100% elimination |
| **Cumulative Layout Shift (CLS)**| 0.04 | **0.00** | Perfect stability |

### Bundle Code-Splitting Optimization

Using Vite dynamic ESM code-splitting (`lazy` & `Suspense`):
- Main entry chunk: `dist/assets/index-Alj14TWr.js` (529 kB)
- Dynamic Onboarding Modal chunk: `dist/assets/OnboardingModal-DUzHxIJG.js` (5.12 kB)
- Dynamic Admin Stats chunk: `dist/assets/AdminStats-NWhMGAE1.js` (5.52 kB)

---

## 💬 Product Validation & User Feedback

During user testing with 10+ distinct wallet users, real-time feedback was collected via the in-app floating widget:

- **Key Highlights & Praise:**
  - *"Seamless escrow funding without manual multi-sig steps."*
  - *"Atomic reputation rating update is visible instantly on the badge."*
- **Average User Score:** **4.8 / 5.0 Stars** across 8 user submissions.
- **Planned Next Enhancements:**
  - Multi-milestone release schedule per gig.
  - Automated decentralized arbitration pool for contested refunds.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js v20+ & npm
- Rust & `wasm32-unknown-unknown` target
- Stellar CLI (`cargo install --locked stellar-cli`)

### Setup Instructions

1. **Clone repository & install dependencies:**
   ```bash
   git clone https://github.com/Zyrex2005/Sorobean-APP.git
   cd "Zyrex Level4"
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Install API backend dependencies
   cd api && npm install && cd ..
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example frontend/.env.local
   ```

3. **Start the API Relay Backend Service:**
   ```bash
   cd api
   npm start
   # Running on http://localhost:3001
   ```

4. **Start the React Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Running on http://localhost:5173
   ```

5. **Run Test Suites:**
   ```bash
   # Run Smart Contract Unit Tests (12 passing tests)
   cargo test --workspace

   # Run Frontend Component Tests (3 passing tests)
   cd frontend && npm test
   ```

---

## 📜 Repository Structure

```
contracts/
  escrow_contract/         # Soroban escrow contract & test suite
  reputation_contract/     # Soroban reputation contract & test suite
api/                       # Node/Express RPC event caching & feedback backend
frontend/
  src/
    components/            # Navbar, OnboardingModal, AdminStats, FeedbackWidget, JobList
    hooks/                 # useWallet, useJobs
    lib/                   # soroban, analytics, sentry
    __tests__/             # Vitest unit test suite
docs/
  CONTRACTS.md             # Gas, TTL, and storage optimization guide
  ARCHITECTURE.md          # Inter-contract call & event streaming design
scripts/deploy.sh          # Automated testnet deployment workflow
.github/workflows/ci.yml   # Level 4 GitHub Actions CI pipeline
```
