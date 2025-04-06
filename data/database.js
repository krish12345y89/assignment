import mongoose from "mongoose";
import { config } from "dotenv";
config()
export const connectDB = () => {
  mongoose
    .connect(String(process.env.MONGO_URI), {
      dbName: "backendapi",
    })
    .then((c) => console.log(`Database Connected with ${c.connection.host}`))
    .catch((e) => console.log(e));
};
