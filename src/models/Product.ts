import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  image?: string;
  category?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
  formattedPrice?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [1000, 'Product description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: { type: String, trim: true },
    category: { type: String, trim: true, default: '', maxlength: 50 },
    inStock: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ category: 1 });

ProductSchema.virtual('formattedPrice').get(function (this: IProduct) {
  return `$${this.price.toFixed(2)}`;
});

ProductSchema.set('toJSON', { virtuals: true });

const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
