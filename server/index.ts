import express from "express";
import { repoRouter } from "./routes/repoRoutes";
import { patchRouter } from "./routes/patchRoutes";
import { historyRouter } from "./routes/historyRoutes";
import { ticketRouter } from "./routes/ticketRoutes";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Mount API routes
app.use("/api", repoRouter);
app.use("/api", patchRouter);
app.use("/api", historyRouter);
app.use("/api", ticketRouter);

const PORT = process.env.PORT || 3061;
app.listen(PORT, () =>
  console.log(`🚀 Local Patch Backend running on http://localhost:${PORT}`),
);
