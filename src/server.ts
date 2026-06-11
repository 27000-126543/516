import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source";
import { config } from "./config";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import passwordRoutes from "./routes/password";
import rotationRoutes from "./routes/rotation";
import loginLogRoutes from "./routes/loginLogs";
import approvalRoutes from "./routes/approvals";
import reportRoutes from "./routes/reports";
import auditRoutes from "./routes/audit";
import importRoutes from "./routes/import";
import adminRoutes from "./routes/admin";
import { startScheduledTasks } from "./scheduler";
import { seedDatabase } from "./scripts/seed";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/rotation", rotationRoutes);
app.use("/api/login-logs", loginLogRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: AppDataSource.isInitialized ? "connected" : "disconnected",
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      message: "服务器内部错误",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("数据库连接成功");

    await seedDatabase();

    startScheduledTasks();
    console.log("定时任务已启动");

    app.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
};

startServer();
