import { app } from "./app.js";
import { connectDB } from "./data/database.js";
import { config } from "dotenv";
config()
connectDB();
app.listen(5000, () => {
  console.log(
    `Server is working on port:${process.env.PORT} in ${process.env.NODE_ENV} Mode`
  );
});
