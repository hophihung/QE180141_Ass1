import { Router, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Cart, { ICart, ICartItem } from "../models/Cart";
import Product, { IProduct } from "../models/Product";
import requireAuth, { AuthRequest } from "../middleware/auth";

const router = Router();

const populateCart = async (cart: ICart) =>
  cart.populate({
    path: "items.product",
    select: "name price image category inStock",
  });

const serializeCart = async (cart: ICart) => {
  await populateCart(cart);

  const items = cart.items.map((item) => {
    const productDoc = item.product as unknown as
      | (IProduct & { _id: mongoose.Types.ObjectId })
      | null;

    const price =
      typeof productDoc?.price === "number"
        ? productDoc.price
        : typeof item.price === "number"
        ? item.price
        : 0;

    const name = productDoc?.name ?? item.name ?? "Unknown product";

    return {
      product: productDoc
        ? {
            id: productDoc._id.toString(),
            name: productDoc.name,
            price,
            image: productDoc.image,
            category: productDoc.category,
            inStock: productDoc.inStock,
          }
        : item.product
        ? {
            id: String(item.product),
            name,
            price,
            image: item.image,
            category: undefined,
            inStock: false,
          }
        : {
            id: "",
            name,
            price,
            image: item.image,
            category: undefined,
            inStock: false,
          },
      quantity: item.quantity,
      unitPrice: price,
      subtotal: price * item.quantity,
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: cart.id,
    items,
    totalAmount,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const findOrCreateCart = async (userId: string) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const cart = await findOrCreateCart(req.userId);
    const data = await serializeCart(cart);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/items",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const productId = String(req.body?.productId || "").trim();
      const quantity = Number(req.body?.quantity ?? 1);

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product id" });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Quantity must be greater than 0" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const cart = await findOrCreateCart(req.userId);
      const existingItem = cart.items.find((item) =>
        item.product ? item.product.toString() === productId : false
      );

      const snapshot: Partial<ICartItem> = {
        product: product._id as mongoose.Types.ObjectId,
        name: product.name,
        price: product.price,
        image: product.image,
      };

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = snapshot.price ?? existingItem.price;
        existingItem.name = snapshot.name ?? existingItem.name;
        existingItem.image = snapshot.image ?? existingItem.image;
      } else {
        cart.items.push({
          product: snapshot.product,
          name: snapshot.name,
          price: snapshot.price ?? 0,
          image: snapshot.image,
          quantity,
        } as ICartItem);
      }

      cart.markModified("items");
      await cart.save();

      const data = await serializeCart(cart);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/items/:productId",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const { productId } = req.params;
      const quantity = Number(req.body?.quantity);

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product id" });
      }

      if (!Number.isFinite(quantity) || quantity < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Quantity must be 0 or greater" });
      }

      const cart = await findOrCreateCart(req.userId);
      const existingItem = cart.items.find((item) =>
        item.product ? item.product.toString() === productId : false
      );
      if (!existingItem) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found in cart" });
      }

      if (quantity === 0) {
        cart.items = cart.items.filter((item) =>
          item.product ? item.product.toString() !== productId : true
        );
      } else {
        const product = await Product.findById(productId);
        if (!product) {
          return res
            .status(404)
            .json({ success: false, message: "Product not found" });
        }
        existingItem.quantity = quantity;
        existingItem.price = product.price;
        existingItem.name = product.name;
        existingItem.image = product.image;
      }

      cart.markModified("items");
      await cart.save();

      const data = await serializeCart(cart);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/items/:productId",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const { productId } = req.params;
      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product id" });
      }

      const cart = await findOrCreateCart(req.userId);
      const beforeLength = cart.items.length;
      cart.items = cart.items.filter((item) =>
        item.product ? item.product.toString() !== productId : true
      );

      if (cart.items.length === beforeLength) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found in cart" });
      }

      cart.markModified("items");
      await cart.save();

      const data = await serializeCart(cart);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const cart = await findOrCreateCart(req.userId);
      cart.items = [];
      cart.markModified("items");
      await cart.save();

      const data = await serializeCart(cart);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
