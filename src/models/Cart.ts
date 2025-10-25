import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICartItem {
  product?: Types.ObjectId;
  name?: string;
  price: number;
  image?: string;
  quantity: number;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [CartItemSchema], default: [] },
    total: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Recalculate total before save
CartSchema.pre<ICart>("save", function (next) {
  try {
    const total = this.items.reduce((acc, it) => {
      const qty = typeof it.quantity === "number" ? it.quantity : 0;
      const price = typeof it.price === "number" ? it.price : 0;
      return acc + price * qty;
    }, 0);
    this.total = Math.max(0, total);
    next();
  } catch (err) {
    next(err as any);
  }
});

CartSchema.set("toJSON", {
  transform(_doc, ret: any) {
    const { _id, __v, ...rest } = ret;
    return { id: _id, ...rest };
  },
});

const Cart = mongoose.model<ICart>("Cart", CartSchema);
export default Cart;
