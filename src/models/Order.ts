import mongoose, { Schema, Document, Types } from "mongoose";

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface IOrderItem {
  product?: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentInfo?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (value: unknown) => Array.isArray(value) && value.length > 0,
        message: "At least one item required",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "cancelled"],
      default: "pending",
    },
    paymentInfo: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

OrderSchema.set("toJSON", {
  transform(_doc, ret: any) {
    const { _id, __v, ...rest } = ret;
    return { id: _id, ...rest };
  },
});

const Order = mongoose.model<IOrder>("Order", OrderSchema);
export default Order;
