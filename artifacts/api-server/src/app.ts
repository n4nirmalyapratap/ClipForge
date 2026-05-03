import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated clips and thumbnails as static files
const downloadsDir = path.resolve(process.cwd(), "downloads");
app.use("/api/media", express.static(downloadsDir, {
  setHeaders(res, filePath) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Videos: allow range requests for seeking; thumbnails: no-cache so regenerated ones show immediately
    if (filePath.endsWith(".mp4")) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Accept-Ranges", "bytes");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.use("/api", router);

export default app;
