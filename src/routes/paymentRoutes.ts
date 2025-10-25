import { Router, Response, NextFunction } from "express";
import Order from "../models/Order";
import payosService from "../services/payosService";

const router = Router();

router.post("/webhook", async (req: any, res: Response, next: NextFunction) => {
  try {
    console.log("📩 PayOS webhook received:", req.body);

    // Xác minh webhook data với PayOS service
    const isValid = payosService.verifyWebhookData(req.body);
    if (!isValid) {
      console.warn("⚠️ Invalid PayOS webhook signature");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const { data } = req.body || {};
    if (!data) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook payload" });
    }

    const orderCode = data?.orderCode;
    if (!orderCode) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderCode" });
    }

    console.log("🔍 Looking for order with orderCode:", orderCode);

    // Tìm order theo orderCode
    const order = await Order.findOne({
      "paymentInfo.payos.orderCode": Number(orderCode),
    }).exec();

    if (!order) {
      console.warn("❌ Order not found for orderCode:", orderCode);
      return res
        .status(404)
        .json({ success: false, message: "Order not found for webhook" });
    }

    console.log("✅ Order found:", {
      orderId: order.id,
      currentStatus: order.status,
      orderCode,
    });

    console.log("🔍 Full webhook data:", {
      data,
      body: req.body,
      headers: req.headers,
    });

    const statusValue = String(data?.status || "").toLowerCase();
    console.log("🔍 Payment status details:", {
      statusValue,
      rawStatus: data?.status,
      success: data?.success,
      description: data?.description,
      orderCode,
      orderId: order.id,
      currentOrderStatus: order.status,
    });

    const isSuccess =
      statusValue === "success" ||
      statusValue === "paid" ||
      statusValue === "completed" ||
      statusValue === "paid_out" ||
      statusValue === "succeeded" ||
      data?.success === true;

    if (isSuccess) {
      console.log("💰 Payment successful, updating order status to 'paid'");

      // Chỉ cập nhật nếu trạng thái hiện tại là pending
      if (order.status === "pending") {
        order.status = "paid";
        order.paymentInfo = {
          ...(order.paymentInfo ?? {}),
          payos: {
            ...(order.paymentInfo as any)?.payos,
            orderCode,
            transactionId: data?.transactionId ?? data?.transId ?? null,
            webhookPayload: data,
          },
          paidAt: new Date().toISOString(),
        };

        await order.save();

        console.log("✅ Order status updated to 'paid':", {
          orderId: order.id,
          orderCode,
          transactionId: data?.transactionId,
          previousStatus: "pending",
        });
      } else {
        console.log("⚠️ Order already processed:", {
          orderId: order.id,
          currentStatus: order.status,
          orderCode,
        });
      }
    } else {
      console.log("❌ Payment not successful, status:", statusValue);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error processing PayOS webhook:", err);
    next(err);
  }
});

export default router;
