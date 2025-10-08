const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

let app;
let token;

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
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }

  // register + login once
  await request(app)
    .post("/api/auth/register")
    .send({ email: "crudtester@example.com", password: "pass1234" });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "crudtester@example.com", password: "pass1234" });
  token = login.body.data.token;
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Product CRUD", () => {
  let createdId;
  const base = "/api/products";
  const sample = {
    name: "Test Shirt",
    description: "Desc",
    price: 19.99,
    category: "tops",
    inStock: true,
  };

  it("POST create product", async () => {
    const res = await request(app)
      .post(base)
      .set("Authorization", `Bearer ${token}`)
      .send(sample);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdId = res.body.data._id;
    expect(createdId).toBeDefined();
  });

  it("GET list includes created product", async () => {
    const res = await request(app).get(base + "?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.find((p) => p._id === createdId)).toBeTruthy();
    expect(res.body.meta).toBeDefined();
  });

  it("PUT update product price", async () => {
    const res = await request(app)
      .put(base + "/" + createdId)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 25 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(25);
  });

  it("DELETE product", async () => {
    const res = await request(app)
      .delete(base + "/" + createdId)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET deleted product returns 404", async () => {
    const res = await request(app).get(base + "/" + createdId);
    expect(res.status).toBe(404);
  });
});
