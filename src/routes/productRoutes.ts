import { Router, Request, Response, NextFunction } from 'express';
import Product, { IProduct } from '../models/Product';
import mongoose from 'mongoose';

const router = Router();

// GET /api/products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 0, 0), 100);
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.inStock === 'true') filter.inStock = true;
    if (req.query.inStock === 'false') filter.inStock = false;

    let query = Product.find(filter);
    if (limit) query = query.skip((page - 1) * limit).limit(limit);

    if (req.query.sort) {
      const sortParts = String(req.query.sort)
        .split(',')
        .reduce<Record<string, 1 | -1>>((acc, part) => {
          const [field, dir] = part.split(':');
            if (field) acc[field] = dir === 'desc' ? -1 : 1;
            return acc;
        }, {});
      if (Object.keys(sortParts).length) query = query.sort(sortParts);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      Product.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, meta: { total, page, limit: limit || null, returned: items.length } });
  } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const { name, description, price, image, category, inStock } = req.body as Partial<IProduct>;
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ success: false, message: 'Invalid price' });
    }
    const product = new Product({ name, description, price: priceNum, image, category, inStock });
    const saved = await product.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const allowed: (keyof IProduct)[] = ['name', 'description', 'price', 'image', 'category', 'inStock'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if ((req.body as any)[key] !== undefined) {
        if (key === 'price') {
          const priceNum = Number((req.body as any)[key]);
          if (!Number.isFinite(priceNum) || priceNum < 0) {
            return res.status(400).json({ success: false, message: 'Invalid price' });
          }
          updates[key] = priceNum;
        } else {
          updates[key] = (req.body as any)[key];
        }
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

export default router;
