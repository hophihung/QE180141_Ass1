const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

// Use the compiled dist server for tests (ensure build ran before tests)
let app;

beforeAll(async () => {
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth_test";
  // Dynamically import compiled server
  const serverPath = path.join(__dirname, "..", "dist", "server.js");
  const mod = require(serverPath);
  app = mod.default;
  if (mod.ready) {
    await mod.ready;
  } else {
    await new Promise((r) => setTimeout(r, 300));
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Products API", () => {
  it("GET /api/health returns ok or degraded", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(["ok", "degraded"]).toContain(res.body.status);
  });
});
