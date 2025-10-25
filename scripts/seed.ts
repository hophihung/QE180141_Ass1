import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Product from "../src/models/Product";
import User from "../src/models/User";

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cloth";
  console.log("Connecting to", uri);
  await mongoose.connect(uri);

  try {
    const email = process.env.SEED_USER_EMAIL || "demo@example.com";
    const password = process.env.SEED_USER_PASSWORD || "password123";
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);

    const ensureUser = async (
      emailValue: string,
      passwordValue: string,
      role: "user" | "admin"
    ) => {
      let record = await User.findOne({ email: emailValue });
      if (!record) {
        const passwordHash = await bcrypt.hash(passwordValue, rounds);
        record = await User.create({ email: emailValue, passwordHash, role });
        console.log(
          `Created ${role} user: ${emailValue} password: ${passwordValue}`
        );
      } else {
        if (record.role !== role) {
          record.role = role;
          await record.save();
          console.log(`Updated ${emailValue} role to ${role}`);
        } else {
          console.log(`${role} user exists: ${emailValue}`);
        }
      }
      return record;
    };

    await ensureUser(email, password, "user");

    if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
      await ensureUser(
        process.env.SEED_ADMIN_EMAIL,
        process.env.SEED_ADMIN_PASSWORD,
        "admin"
      );
    }

    const samples = [
      {
        name: "Classic Tee",
        description: "100% cotton classic t-shirt",
        price: 19.99,
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=640&q=80&auto=format&fit=crop",
        category: "tops",
        inStock: true,
      },
      {
        name: "Denim Jacket",
        description: "Timeless denim jacket with a modern fit",
        price: 69.99,
        image:
          "https://images.unsplash.com/photo-1520975922284-9d8c0f7f1d9f?w=640&q=80&auto=format&fit=crop",
        category: "outerwear",
        inStock: true,
      },
      {
        name: "Chino Pants",
        description: "Slim-fit chinos for everyday wear",
        price: 39.99,
        image:
          "https://images.unsplash.com/photo-1593032457860-0197f44cfd46?w=640&q=80&auto=format&fit=crop",
        category: "bottoms",
        inStock: true,
      },
    ];

    for (const p of samples) {
      const exists = await Product.findOne({ name: p.name });
      if (!exists) {
        await Product.create(p);
        console.log("Added product:", p.name);
      } else {
        console.log("Product exists:", p.name);
      }
    }

    console.log("Seeding complete.");
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
