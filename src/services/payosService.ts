import PayOS from "@payos/node";

class PayOSService {
  private payos: PayOS;

  constructor() {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error(
        "PayOS configuration missing. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY"
      );
    }

    this.payos = new PayOS(clientId, apiKey, checksumKey);
  }

  /**
   * Tạo link thanh toán PayOS
   */
  async createPaymentLink(data: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }) {
    try {
      console.log("Creating PayOS payment link:", {
        orderCode: data.orderCode,
        amount: data.amount,
        description: data.description,
      });

      const paymentLink = await this.payos.createPaymentLink(data);

      console.log("PayOS payment link created:", {
        orderCode: paymentLink.orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
      });

      return paymentLink;
    } catch (error) {
      console.error("Error creating PayOS payment link:", error);
      throw error;
    }
  }

  /**
   * Xác minh webhook data từ PayOS
   */
  verifyWebhookData(data: any) {
    try {
      // Sử dụng method mới từ PayOS SDK
      return this.payos.verifyPaymentWebhookData(data);
    } catch (error) {
      console.error("Error verifying PayOS webhook data:", error);
      return false;
    }
  }

  /**
   * Tạo orderCode duy nhất
   */
  generateOrderCode(): number {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 900 + 100);
    return parseInt(`${timestamp}${random}`);
  }
}

export default new PayOSService();
