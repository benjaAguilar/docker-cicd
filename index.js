import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
const DB_PWD = process.env.MONGO_INITDB_ROOT_PASSWORD;

const Mate = mongoose.model(
  "Mate",
  new mongoose.Schema({
    name: String,
    price: Number,
  }),
);

const DB_URL = `mongodb://${DB_USERNAME}:${DB_PWD}@db:27017/backend?authSource=admin`;
mongoose.connect(DB_URL);

const app = express();

app.get("/", async (_req, res) => {
  console.log(`GET request of "/"`);
  console.log("Hello im hot reload on docker");
  const mates = await Mate.find();

  res.json({
    success: true,
    message: "welcome to my app",
    mates,
  });
});

app.get("/add", async (_req, res) => {
  console.log(`GET request of "/add"`);
  await Mate.create({ name: "porongo", price: 10 });

  res.json({
    success: true,
    message: "Mate created",
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
