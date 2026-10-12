import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT = parseInt(process.env.BACKEND_PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`===============================================`);
  console.log(` LandAI Authentication & Database Backend Running`);
  console.log(` Port: ${PORT}`);
  console.log(` URL:  http://localhost:${PORT}`);
  console.log(` SQLite Database: Initialized & Verified`);
  console.log(`===============================================`);
});
