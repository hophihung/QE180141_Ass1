import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

UserSchema.set("toJSON", {
  transform(_doc, ret: any) {
    const { _id, passwordHash, __v, ...rest } = ret;
    return { id: _id, ...rest };
  },
});

UserSchema.set("toObject", {
  transform(_doc, ret: any) {
    const { _id, passwordHash, __v, ...rest } = ret;
    return { id: _id, ...rest };
  },
});

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
