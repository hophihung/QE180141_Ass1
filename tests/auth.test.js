const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

let app;

beforeAll(async () => {
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth_test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  const serverPath = path.join(__dirname, "..", "dist", "server.js");
  delete require.cache[require.resolve(serverPath)];
  const mod = require(serverPath);
  app = mod.default;
  if (mod.ready) {
    await mod.ready;
  } else {
    await new Promise((r) => setTimeout(r, 300));
  }
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth API", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "authuser@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("authuser@example.com");
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("prevents duplicate registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "authuser@example.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("logs in and returns token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "authuser@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("authuser@example.com");
  });

  it("rejects invalid login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "authuser@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("blocks product creation without token", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Nope", description: "Should fail", price: 10 });
    expect(res.status).toBe(401);
  });
});
