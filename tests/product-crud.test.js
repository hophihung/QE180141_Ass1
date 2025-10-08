const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");

let app;

beforeAll(async () => {
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth_test";
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
    const res = await request(app).post(base).send(sample);
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
      .send({ price: 25 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(25);
  });

  it("DELETE product", async () => {
    const res = await request(app).delete(base + "/" + createdId);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET deleted product returns 404", async () => {
    const res = await request(app).get(base + "/" + createdId);
    expect(res.status).toBe(404);
  });
});
