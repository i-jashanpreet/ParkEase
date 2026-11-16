import express from "express";
import cors from "cors";
import { clientOrigin } from "./routes/authRoutes.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
export default app;
