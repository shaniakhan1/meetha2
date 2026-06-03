import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, type Response, type NextFunction } from "express";

// Initialize Sentry before anything else — errors only, no performance tracing
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    integrations: [],
  });
}
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { handleMagicLink, handleSetSession, handleLogout, handleMe, handlePreviewAuth } from "./auth";
import { handleDownload } from "../download";
import { handleBriefCardDownload } from "../briefCardDownload";
import { handleStyleCardDownload } from "../styleCardDownload";
import { handleStyleCard } from "../styleCardEndpoint";
import { handleLoraCheck } from "../loraEmailCron";
import { handleArchiveGenerations } from "../archiveCron";
import { handleWelcomeEmail } from "../welcomeEmailCron";
import { handleDailyMonitor } from "../dailyMonitor";
import { handleStripeRetrainWebhook } from "../stripeWebhook";
import { loraUploadMiddleware, handleLoraUpload, handleLoraStatus } from "../loraUpload";
import { beforePhotoUploadMiddleware, handleBeforePhotoUpload } from "../beforePhotoUpload";
import { recoverStuckJobs } from "../loraPoller";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** Magic-link: 5 requests per IP per 15 minutes — prevents email enumeration/spam */
const magicLinkLimiter = rateLimit({
  validate: false, // suppress validation warnings in this environment
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait 15 minutes before trying again." },
});

/** Generation: 10 requests per session per minute — prevents credit-burn abuse */
const generateLimiter = rateLimit({
  validate: false, // suppress validation warnings — we key by cookie, not IP
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please slow down." },
  keyGenerator: (req) => {
    // Key by session cookie prefix rather than IP so users behind shared proxies aren't blocked together
    const cookie = req.headers.cookie;
    if (cookie) return cookie.slice(0, 64);
    // Fall back to IP — normalize IPv6 mapped IPv4 addresses
    const ip = (req.ip ?? req.socket?.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
    return ip;
  },
});

// ─── Scheduled endpoint auth ──────────────────────────────────────────────────

/**
 * Middleware that requires a valid CRON_SECRET bearer token.
 * Scheduled endpoints are only called by the Manus Heartbeat service which
 * sends Authorization: Bearer <CRON_SECRET>. Unauthenticated callers get 401.
 */
function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured (e.g. local dev without .env), skip check
  if (!secret) {
    next();
    return;
  }
  const auth = req.headers.authorization ?? "";
  if (auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ─── Port helpers ─────────────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook MUST use raw body BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeRetrainWebhook);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  // Supabase Auth routes
  app.post("/api/auth/magic-link", magicLinkLimiter, handleMagicLink);
  app.post("/api/auth/session", handleSetSession);
  app.post("/api/auth/logout", handleLogout);
  app.get("/api/auth/me", handleMe);
  app.get("/api/auth/preview", handlePreviewAuth);

  app.get("/api/download/brief-card", handleBriefCardDownload);
  app.get("/api/download/style-card", handleStyleCardDownload);
  app.get("/api/download/:generationId", handleDownload);
  app.get("/api/style-card/:generationId", handleStyleCard);

  app.post("/api/lora/upload", loraUploadMiddleware, handleLoraUpload);
  app.post("/api/upload-before-photo", beforePhotoUploadMiddleware, handleBeforePhotoUpload);
  app.get("/api/lora/status", handleLoraStatus);

  // Scheduled endpoints — protected by CRON_SECRET
  app.post("/api/scheduled/lora-check", requireCronSecret, handleLoraCheck);
  app.post("/api/scheduled/archive-generations", requireCronSecret, handleArchiveGenerations);
  app.post("/api/scheduled/welcome-email", requireCronSecret, handleWelcomeEmail);
  app.post("/api/scheduled/daily-monitor", requireCronSecret, handleDailyMonitor);

  // tRPC API — apply generation rate limit to generate procedures
  app.use("/api/trpc/generation.generate", generateLimiter);
  app.use("/api/trpc/generation.fromVoice", generateLimiter);
  app.use("/api/trpc/video.generate", generateLimiter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Sentry error handler MUST be after all routes and before any other error middleware
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Resume polling for any LoRA jobs that were in-progress when server last restarted
    recoverStuckJobs().catch((err) =>
      console.warn("[LoraPoller] Recovery on startup failed (non-fatal):", err)
    );
  });
}

startServer().catch(console.error);
