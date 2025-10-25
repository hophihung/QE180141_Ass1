import { Router, Response, NextFunction } from "express";
import mongoose from "mongoose";
import axios, { AxiosError } from "axios";
import Cart from "../models/Cart";
import Product, { IProduct } from "../models/Product";
import Order, { IOrder, OrderStatus } from "../models/Order";
import requireAuth, { AuthRequest } from "../middleware/auth";
import payosService from "../services/payosService";

const router = Router();

const allowedStatuses: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "cancelled",
];

const serializeOrder = (order: IOrder) => {
  const items = order.items.map((item) => ({
    productId: item.product ? item.product.toString() : null,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
    subtotal: item.price * item.quantity,
  }));

  return {
    id: order.id,
    userId: order.user.toString(),
    items,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentInfo: order.paymentInfo ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      success: true,
      data: orders.map((order) => serializeOrder(order)),
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:id",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid order id" });
      }

      const order = await Order.findOne({ _id: id, user: req.userId }).exec();
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      res.json({ success: true, data: serializeOrder(order) });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<any>;
        const status = axiosErr.response?.status ?? 502;
        const payload = axiosErr.response?.data;
        const message =
          (payload && (payload.message || payload.desc)) ||
          axiosErr.message ||
          "Payment provider error";

        return res.status(status).json({
          success: false,
          message,
          details: payload ?? null,
        });
      }

      next(err);
    }
  }
);

router.post(
  "/",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const cart = await Cart.findOne({ user: req.userId }).populate({
        path: "items.product",
        select: "name price image inStock",
      });

      if (!cart || !cart.items.length) {
        return res
          .status(400)
          .json({ success: false, message: "Cart is empty" });
      }

      const orderItems: IOrder["items"] = [];
      let totalAmount = 0;

      for (const item of cart.items) {
        const productDoc = item.product as unknown as
          | (IProduct & {
              _id: mongoose.Types.ObjectId;
            })
          | null;

        if (productDoc && productDoc.inStock === false) {
          return res.status(400).json({
            success: false,
            message: `Product ${productDoc.name} is out of stock`,
          });
        }

        const quantity = item.quantity;
        const price =
          typeof productDoc?.price === "number"
            ? productDoc.price
            : typeof item.price === "number"
            ? item.price
            : 0;

        if (quantity <= 0 || price < 0) {
          continue;
        }

        orderItems.push({
          product: productDoc?._id,
          name: productDoc?.name ?? item.name ?? "Unknown product",
          price,
          quantity,
          image: productDoc?.image ?? item.image,
        });

        totalAmount += price * quantity;
      }

      if (!orderItems.length) {
        return res
          .status(400)
          .json({ success: false, message: "No valid items to order" });
      }

      const order = await Order.create({
        user: new mongoose.Types.ObjectId(req.userId),
        items: orderItems,
        totalAmount,
        status: "pending",
        paymentInfo: null,
      });

      cart.items = [];
      cart.markModified("items");
      await cart.save();

      res.status(201).json({ success: true, data: serializeOrder(order) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/status",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;
      const nextStatus = String(req.body?.status || "").trim() as OrderStatus;

      if (!mongoose.isValidObjectId(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid order id" });
      }

      if (!allowedStatuses.includes(nextStatus)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid status" });
      }

      // Tìm order
      const order = await Order.findById(id).exec();
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Chỉ cho phép user cập nhật đơn hàng của họ hoặc admin
      if (order.user.toString() !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You can only update your own orders",
        });
      }

      // Nếu không phải admin, chỉ cho phép cập nhật trạng thái thành 'paid' khi có callback từ PayOS
      if (req.userRole !== "admin" && nextStatus !== "paid") {
        return res.status(403).json({
          success: false,
          message: "Only admin can change order status",
        });
      }

      // Cập nhật trạng thái
      order.status = nextStatus;

      if (nextStatus === "paid" && req.body?.paymentInfo) {
        order.paymentInfo = {
          ...(order.paymentInfo ?? {}),
          ...req.body.paymentInfo,
        };
      }

      if (nextStatus === "cancelled" && !req.body?.skipPaymentUpdate) {
        order.paymentInfo = {
          ...(order.paymentInfo ?? {}),
          cancelledAt: new Date().toISOString(),
        };
      }

      await order.save();

      res.json({ success: true, data: serializeOrder(order) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/pay",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid order id" });
      }

      const order = await Order.findOne({ _id: id, user: req.userId }).exec();

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      if (order.status === "paid") {
        return res
          .status(400)
          .json({ success: false, message: "Order already paid" });
      }

      const rawTotal = Number(order.totalAmount);
      if (!Number.isFinite(rawTotal) || rawTotal <= 0) {
        console.warn("Invalid order total for payment", {
          orderId: order.id,
          rawTotal,
        });
        return res.status(400).json({
          success: false,
          message: "Order amount must be greater than 0",
        });
      }

      // Tạo orderCode duy nhất
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 900 + 100);
      const orderCode = parseInt(`${timestamp}${random}`);

      // Chuyển đổi từ USD sang VND (1 USD = ~25,000 VND)
      const USD_TO_VND_RATE = 25000;
      const amountInVND = Math.round(rawTotal * USD_TO_VND_RATE);

      // Đảm bảo số tiền tối thiểu 2000 VND theo yêu cầu của PayOS
      const amount = Math.max(2000, amountInVND);

      console.log("Payment amount conversion:", {
        originalUSD: rawTotal,
        convertedVND: amountInVND,
        finalVND: amount,
      });

      // Cấu hình URLs cho development và production
      let appUrl;
      if (process.env.NODE_ENV === "production") {
        appUrl = "https://qe-180141-ass1-cloth-cruiser-cart.vercel.app";
      } else {
        appUrl = "http://localhost:8080";
      }

      // Sửa URL để match với router của frontend
      const returnUrl = `${appUrl}/orders/${order.id}`;
      const cancelUrl = `${appUrl}/orders/${order.id}`;

      // Giới hạn description tối đa 25 ký tự theo yêu cầu của PayOS
      const description = `Order #${order.id.substring(order.id.length - 8)}`;

      // Validate description length
      if (description.length > 25) {
        console.warn("Description too long for PayOS", {
          length: description.length,
          description,
        });
        return res.status(400).json({
          success: false,
          message: "Order description must not exceed 25 characters",
        });
      }

      // Log order details for debugging
      console.log("Order details for payment:", {
        orderId: order.id,
        userId: order.user,
        totalAmount: order.totalAmount,
        status: order.status,
        itemsCount: order.items.length,
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
      });

      const paymentData = {
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
      };

      console.log("Creating PayOS payment link:", {
        orderId: order.id,
        ...paymentData,
      });

      const payment = await payosService.createPaymentLink(paymentData);

      if (!payment?.checkoutUrl) {
        console.error("PayOS response missing checkoutUrl:", payment);
        return res.status(502).json({
          success: false,
          message: "Payment provider did not return a valid URL",
        });
      }

      // Lưu thông tin payment vào order
      order.paymentInfo = {
        ...(order.paymentInfo ?? {}),
        payos: {
          orderCode,
          paymentUrl: payment.checkoutUrl,
          raw: payment,
        },
      };

      await order.save();

      console.log("Payment link created successfully:", {
        orderId: order.id,
        orderCode,
        paymentUrl: payment.checkoutUrl,
      });

      res.json({
        success: true,
        data: {
          paymentUrl: payment.checkoutUrl,
          orderCode,
          order: serializeOrder(order),
        },
      });
    } catch (err) {
      console.error("Error creating payment link:", err);
      next(err);
    }
  }
);

export default router;
