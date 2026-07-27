const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const STORE_PATH = path.join(__dirname, "feedback_store.json");

app.use(cors());
app.use(express.json());

// In-memory caching layer for RPC event relay (10s TTL)
let rpcCache = {
  data: null,
  timestamp: 0,
  ttlMs: 10000,
};

// Initialize feedback store if missing
if (!fs.existsSync(STORE_PATH)) {
  fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2));
}

function readFeedbackStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[API Error] Failed to read feedback store:", err);
    return [];
  }
}

function writeFeedbackStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[API Error] Failed to write feedback store:", err);
  }
}

// 1. Health-check Endpoint
app.get("/api/health", async (req, res) => {
  let rpcHealthy = false;
  try {
    const rpcRes = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    });
    const data = await rpcRes.json();
    rpcHealthy = data.result?.status === "healthy";
  } catch (err) {
    console.error("[API Health] RPC Ping error:", err.message);
  }

  res.json({
    status: "ok",
    service: "SkillEscrow API Relay",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    sorobanRpc: {
      url: SOROBAN_RPC_URL,
      healthy: rpcHealthy,
    },
  });
});

// 2. Soroban RPC Event Relay with 10s Caching
app.get("/api/rpc-relay/events", async (req, res) => {
  const now = Date.now();
  const contractId = req.query.contractId;

  if (rpcCache.data && now - rpcCache.timestamp < rpcCache.ttlMs) {
    return res.json({ cached: true, events: rpcCache.data });
  }

  try {
    const bodyPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getEvents",
      params: {
        startLedger: 0,
        filters: contractId
          ? [{ type: "contract", contractIds: [contractId] }]
          : [],
        pagination: { limit: 20 },
      },
    };

    const rpcRes = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    const data = await rpcRes.json();
    rpcCache.data = data.result?.events || [];
    rpcCache.timestamp = now;

    res.json({ cached: false, events: rpcCache.data });
  } catch (err) {
    console.error("[API Error] RPC relay failed:", err.message);
    res.status(500).json({ error: "Failed to query Soroban RPC event log", details: err.message });
  }
});

// 3. User Feedback Collection Endpoints
app.post("/api/feedback", (req, res) => {
  const { rating, comment, address } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  const feedbackList = readFeedbackStore();
  const newEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    rating: Number(rating),
    comment: comment?.trim() || "",
    address: address || "anonymous",
    timestamp: new Date().toISOString(),
  };

  feedbackList.push(newEntry);
  writeFeedbackStore(feedbackList);

  res.status(201).json({ success: true, entry: newEntry });
});

app.get("/api/feedback", (req, res) => {
  const feedbackList = readFeedbackStore();
  const total = feedbackList.length;
  const avgRating = total > 0
    ? (feedbackList.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(2)
    : 0;

  res.json({
    total,
    averageRating: Number(avgRating),
    feedback: feedbackList,
  });
});

// 4. Admin / Stats Aggregation Endpoint
app.get("/api/stats", (req, res) => {
  const feedbackList = readFeedbackStore();
  const totalFeedback = feedbackList.length;
  const avgRating = totalFeedback > 0
    ? (feedbackList.reduce((sum, item) => sum + item.rating, 0) / totalFeedback).toFixed(2)
    : "N/A";

  res.json({
    service: "SkillEscrow Production API",
    totalFeedbackSubmissions: totalFeedback,
    averageRating: avgRating,
    cacheStatus: {
      cachedItems: rpcCache.data ? rpcCache.data.length : 0,
      lastUpdated: rpcCache.timestamp ? new Date(rpcCache.timestamp).toISOString() : "Never",
    },
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[API Error Handler]", err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SkillEscrow API] Running on port ${PORT} with RPC ${SOROBAN_RPC_URL}`);
  });
}

module.exports = app;
