const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { isValidObjectId } = require("mongoose");

// GET /api/products - Get all products
router.get("/", async (req, res, next) => {
  try {
    // Simple optional pagination & filtering
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 0, 0), 100); // 0 = no limit
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.inStock === "true") filter.inStock = true;
    if (req.query.inStock === "false") filter.inStock = false;

    let query = Product.find(filter);
    if (limit) query = query.skip((page - 1) * limit).limit(limit);

    // Basic sorting ?sort=price:asc,name:desc
    if (req.query.sort) {
      const sortParts = String(req.query.sort)
        .split(",")
        .reduce((acc, part) => {
          const [field, dir] = part.split(":");
          if (field) acc[field] = dir === "desc" ? -1 : 1;
          return acc;
        }, {});
      if (Object.keys(sortParts).length) query = query.sort(sortParts);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit: limit || null,
        returned: items.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get product by ID
router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create new product
router.post("/", async (req, res, next) => {
  try {
    const { name, description, price, image, category, inStock } = req.body;

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    const product = new Product({
      name,
      description,
      price: priceNum,
      image,
      category,
      inStock,
    });

    const savedProduct = await product.save();
    res.status(201).json({ success: true, data: savedProduct });
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Update product by ID
router.put("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }
    const allowed = [
      "name",
      "description",
      "price",
      "image",
      "category",
      "inStock",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "price") {
          const priceNum = Number(req.body[key]);
          if (!Number.isFinite(priceNum) || priceNum < 0) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid price" });
          }
          updates[key] = priceNum;
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Delete product by ID
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
