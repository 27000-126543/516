import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import {
  generateHealthReport,
  exportReportToExcel,
  exportReportToPDF,
  generateDailyReport,
} from "../services/reportService";

const router = Router();

router.use(authMiddleware);

router.get("/health", async (req: AuthRequest, res: Response) => {
  try {
    const report = await generateHealthReport();
    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: "生成报告失败", error: (error as Error).message });
  }
});

router.get("/health/export/excel", requireRole("admin", "director"), async (req: AuthRequest, res: Response) => {
  try {
    const report = await generateHealthReport();
    const buffer = await exportReportToExcel(report);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=password-health-report-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: "导出Excel失败", error: (error as Error).message });
  }
});

router.get("/health/export/pdf", requireRole("admin", "director"), async (req: AuthRequest, res: Response) => {
  try {
    const report = await generateHealthReport();
    const buffer = await exportReportToPDF(report);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=password-health-report-${new Date().toISOString().split("T")[0]}.pdf`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: "导出PDF失败", error: (error as Error).message });
  }
});

router.post("/daily/generate", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const report = await generateDailyReport();
    res.json({ message: "每日报告已生成", report });
  } catch (error) {
    res.status(500).json({ message: "生成报告失败", error: (error as Error).message });
  }
});

export default router;
