const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

// Use the compiled dist server for tests (ensure build ran before tests)
let app;

beforeAll(async () => {
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth_test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  // Dynamically import compiled server (clear cache so connect runs)
  const serverPath = path.join(__dirname, "..", "dist", "server.js");
  delete require.cache[require.resolve(serverPath)];
  const mod = require(serverPath);
  app = mod.default;
  if (mod.ready) {
    await mod.ready;
  } else {
    await new Promise((r) => setTimeout(r, 300));
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Products API", () => {
  it("GET /api/health returns ok or degraded", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(["ok", "degraded"]).toContain(res.body.status);
  });
});
