import express from "express";
import { db } from "./db";
```const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});