import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  createApprovalRequest,
  approveRequest,
  rejectRequest,
  getApprovalRequests,
} from "../services/approvalService";
import { RequestType } from "../entities/ApprovalRequest";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as any;
    const requestType = req.query.requestType as RequestType;
    const type = req.query.type as string;

    let requesterId: number | undefined;
    let approverId: number | undefined;

    if (type === "my") {
      requesterId = req.userId;
    } else if (type === "pending") {
      approverId = req.userId;
    }

    const result = await getApprovalRequests({
      requesterId,
      approverId,
      status,
      requestType,
      page,
      pageSize,
    });

    res.json({
      requests: result.requests,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: "获取申请列表失败", error: (error as Error).message });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { requestType, reason, relatedAccountId, priority } = req.body;

    if (!requestType || !reason) {
      return res.status(400).json({ message: "请填写申请类型和原因" });
    }

    const request = await createApprovalRequest({
      requesterId: req.userId!,
      requestType,
      reason,
      relatedAccountId,
      priority,
    });

    res.status(201).json({
      message: "申请已提交",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: "提交申请失败", error: (error as Error).message });
  }
});

router.post("/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { comments } = req.body;

    const result = await approveRequest({
      requestId: id,
      approverId: req.userId!,
      comments,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: result.message, request: result.request });
  } catch (error) {
    res.status(500).json({ message: "审批失败", error: (error as Error).message });
  }
});

router.post("/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "请填写驳回原因" });
    }

    const result = await rejectRequest({
      requestId: id,
      approverId: req.userId!,
      rejectionReason,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: result.message, request: result.request });
  } catch (error) {
    res.status(500).json({ message: "驳回失败", error: (error as Error).message });
  }
});

export default router;
