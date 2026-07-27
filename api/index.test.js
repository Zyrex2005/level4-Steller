const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("./index.js");

let server;
let baseUrl;

test.before((t, done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

test.after((t, done) => {
  server.close(done);
});

test("GET /api/health returns healthy status schema", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.service, "SkillEscrow API Relay");
  assert.ok(typeof body.uptimeSeconds === "number");
});

test("POST /api/feedback validates rating input", async () => {
  const invalidRes = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 10, comment: "Too high" }),
  });
  assert.strictEqual(invalidRes.status, 400);

  const validRes = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 5, comment: "Excellent escrow system!", address: "GABC123" }),
  });
  assert.strictEqual(validRes.status, 201);
  const body = await validRes.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.entry.rating, 5);
  assert.strictEqual(body.entry.comment, "Excellent escrow system!");
});

test("GET /api/feedback returns feedback array and calculated average", async () => {
  const res = await fetch(`${baseUrl}/api/feedback`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.total === "number");
  assert.ok(Array.isArray(body.feedback));
  assert.ok(body.total >= 1);
});

test("GET /api/stats returns service stats overview", async () => {
  const res = await fetch(`${baseUrl}/api/stats`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.service, "SkillEscrow Production API");
  assert.ok(typeof body.totalFeedbackSubmissions === "number");
});
