import { AppDataSource } from "../data-source";
import {
  ApprovalRequest,
  RequestType,
  ApprovalStatus,
  Priority,
} from "../entities/ApprovalRequest";
import { User } from "../entities/User";
import { createAuditLog } from "./auditService";
import { sendSecurityAlertToGroup } from "./notificationService";

export const createApprovalRequest = async (params: {
  requesterId: number;
  requestType: RequestType;
  reason: string;
  relatedAccountId?: number;
  priority?: Priority;
}): Promise<ApprovalRequest> => {
  const requestRepo = AppDataSource.getRepository(ApprovalRequest);
  const userRepo = AppDataSource.getRepository(User);

  const requester = await userRepo.findOne({ where: { id: params.requesterId } });
  if (!requester) {
    throw new Error("申请人不存在");
  }

  const isManager = requester.role === "manager" || requester.role === "director";
  const totalLevels = isManager ? 2 : 1;

  let currentApproverId: number | undefined;
  let currentApproverName: string | undefined;

  if (requester.supervisorId) {
    const supervisor = await userRepo.findOne({
      where: { id: requester.supervisorId },
    });
    if (supervisor) {
      currentApproverId = supervisor.id;
      currentApproverName = supervisor.realName;
    }
  }

  const request = requestRepo.create({
    requesterId: params.requesterId,
    requesterName: requester.realName,
    department: requester.department,
    requestType: params.requestType,
    status: "pending",
    priority: params.priority || "medium",
    reason: params.reason,
    currentApproverId,
    currentApproverName,
    approvalLevel: 1,
    totalLevels,
    relatedAccountId: params.relatedAccountId,
    approvalHistory: JSON.stringify([]),
  });

  const savedRequest = await requestRepo.save(request);

  await createAuditLog({
    userId: params.requesterId,
    username: requester.username,
    action: "approval_create",
    level: "info",
    description: `创建${getRequestTypeLabel(params.requestType)}申请，ID: ${savedRequest.id}`,
  });

  return savedRequest;
};

export const approveRequest = async (params: {
  requestId: number;
  approverId: number;
  comments?: string;
}): Promise<{ success: boolean; message: string; request?: ApprovalRequest }> => {
  const requestRepo = AppDataSource.getRepository(ApprovalRequest);
  const userRepo = AppDataSource.getRepository(User);

  const request = await requestRepo.findOne({ where: { id: params.requestId } });
  if (!request) {
    return { success: false, message: "申请不存在" };
  }

  if (request.status !== "pending") {
    return { success: false, message: "申请已处理" };
  }

  if (request.currentApproverId !== params.approverId) {
    return { success: false, message: "您不是当前审批人" };
  }

  const approver = await userRepo.findOne({ where: { id: params.approverId } });
  if (!approver) {
    return { success: false, message: "审批人不存在" };
  }

  const history = JSON.parse(request.approvalHistory || "[]");
  history.push({
    level: request.approvalLevel,
    approverId: params.approverId,
    approverName: approver.realName,
    action: "approve",
    comments: params.comments,
    approvedAt: new Date().toISOString(),
  });

  if (request.approvalLevel >= request.totalLevels) {
    request.status = "approved";
    request.approvedAt = new Date();
    request.approvalHistory = JSON.stringify(history);

    await requestRepo.save(request);

    if (request.requestType === "account_unlock") {
      await unlockAccount(request.relatedAccountId || request.requesterId);
    } else if (request.requestType === "permission_restore") {
      await restorePermissions(request.relatedAccountId || request.requesterId);
    }

    await createAuditLog({
      userId: params.approverId,
      username: approver.username,
      action: "approval_approve",
      level: "info",
      description: `审批通过申请 ID: ${request.id}`,
    });

    return { success: true, message: "审批通过", request };
  } else {
    request.approvalLevel += 1;
    request.approvalHistory = JSON.stringify(history);

    if (approver.role === "manager") {
      const directors = await userRepo.find({ where: { role: "director" } });
      if (directors.length > 0) {
        request.currentApproverId = directors[0].id;
        request.currentApproverName = directors[0].realName;
      }
    }

    await requestRepo.save(request);

    return { success: true, message: "审批通过，已提交下一级审批", request };
  }
};

export const rejectRequest = async (params: {
  requestId: number;
  approverId: number;
  rejectionReason: string;
}): Promise<{ success: boolean; message: string; request?: ApprovalRequest }> => {
  const requestRepo = AppDataSource.getRepository(ApprovalRequest);
  const userRepo = AppDataSource.getRepository(User);

  const request = await requestRepo.findOne({ where: { id: params.requestId } });
  if (!request) {
    return { success: false, message: "申请不存在" };
  }

  if (request.status !== "pending") {
    return { success: false, message: "申请已处理" };
  }

  const approver = await userRepo.findOne({ where: { id: params.approverId } });
  if (!approver) {
    return { success: false, message: "审批人不存在" };
  }

  const history = JSON.parse(request.approvalHistory || "[]");
  history.push({
    level: request.approvalLevel,
    approverId: params.approverId,
    approverName: approver.realName,
    action: "reject",
    rejectionReason: params.rejectionReason,
    rejectedAt: new Date().toISOString(),
  });

  request.status = "rejected";
  request.rejectedAt = new Date();
  request.rejectionReason = params.rejectionReason;
  request.approvalHistory = JSON.stringify(history);

  await requestRepo.save(request);

  await createAuditLog({
    userId: params.approverId,
    username: approver.username,
    action: "approval_reject",
    level: "warning",
    description: `驳回申请 ID: ${request.id}, 原因: ${params.rejectionReason}`,
  });

  return { success: true, message: "已驳回申请", request };
};

export const getApprovalRequests = async (params: {
  requesterId?: number;
  approverId?: number;
  status?: ApprovalStatus;
  requestType?: RequestType;
  page?: number;
  pageSize?: number;
}): Promise<{ requests: ApprovalRequest[]; total: number }> => {
  const requestRepo = AppDataSource.getRepository(ApprovalRequest);
  const queryBuilder = requestRepo.createQueryBuilder("request");

  if (params.requesterId) {
    queryBuilder.andWhere("request.requesterId = :requesterId", {
      requesterId: params.requesterId,
    });
  }

  if (params.approverId) {
    queryBuilder.andWhere("request.currentApproverId = :approverId", {
      approverId: params.approverId,
    });
  }

  if (params.status) {
    queryBuilder.andWhere("request.status = :status", { status: params.status });
  }

  if (params.requestType) {
    queryBuilder.andWhere("request.requestType = :requestType", {
      requestType: params.requestType,
    });
  }

  queryBuilder.orderBy("request.createdAt", "DESC");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  queryBuilder.skip((page - 1) * pageSize).take(pageSize);

  const [requests, total] = await queryBuilder.getManyAndCount();

  return { requests, total };
};

const unlockAccount = async (userId: number): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (user && (user.status === "disabled" || user.status === "frozen")) {
    user.status = "active";
    user.failedLoginAttempts = 0;
    user.abnormalLoginCount = 0;
    user.frozenAt = null as any;
    await userRepo.save(user);

    await sendSecurityAlertToGroup(
      "账号解锁",
      `账号已解锁: ${user.realName}`,
      `用户 ${user.realName} (${user.username}) 的账号已通过审批解锁。`,
      "info"
    );

    await createAuditLog({
      userId,
      action: "account_enable",
      level: "info",
      description: "账号通过审批解锁",
    });
  }
};

const restorePermissions = async (userId: number): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (user) {
    user.status = "active";
    await userRepo.save(user);

    await createAuditLog({
      userId,
      action: "account_enable",
      level: "info",
      description: "权限已恢复",
    });
  }
};

const getRequestTypeLabel = (type: RequestType): string => {
  const labels: Record<RequestType, string> = {
    password_reset: "密码重置",
    account_unlock: "账号解锁",
    permission_restore: "权限恢复",
  };
  return labels[type] || type;
};
