import { AppDataSource } from "../data-source";
import { AuditLog, AuditAction, AuditLevel } from "../entities/AuditLog";

export const createAuditLog = async (params: {
  userId?: number;
  username?: string;
  action: AuditAction;
  level?: AuditLevel;
  description?: string;
  ipAddress?: string;
  systemId?: number;
  metadata?: Record<string, any>;
}): Promise<AuditLog> => {
  const auditLogRepo = AppDataSource.getRepository(AuditLog);

  const auditLog = auditLogRepo.create({
    userId: params.userId,
    username: params.username,
    action: params.action,
    level: params.level || "info",
    description: params.description,
    ipAddress: params.ipAddress,
    systemId: params.systemId,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
  });

  return auditLogRepo.save(auditLog);
};

export const getAuditLogs = async (params: {
  page?: number;
  pageSize?: number;
  userId?: number;
  action?: AuditAction;
  level?: AuditLevel;
  systemId?: number;
  startTime?: Date;
  endTime?: Date;
}): Promise<{ logs: AuditLog[]; total: number }> => {
  const auditLogRepo = AppDataSource.getRepository(AuditLog);
  const queryBuilder = auditLogRepo.createQueryBuilder("log");

  if (params.userId) {
    queryBuilder.andWhere("log.userId = :userId", { userId: params.userId });
  }

  if (params.action) {
    queryBuilder.andWhere("log.action = :action", { action: params.action });
  }

  if (params.level) {
    queryBuilder.andWhere("log.level = :level", { level: params.level });
  }

  if (params.systemId) {
    queryBuilder.andWhere("log.systemId = :systemId", { systemId: params.systemId });
  }

  if (params.startTime) {
    queryBuilder.andWhere("log.createdAt >= :startTime", { startTime: params.startTime });
  }

  if (params.endTime) {
    queryBuilder.andWhere("log.createdAt <= :endTime", { endTime: params.endTime });
  }

  queryBuilder.orderBy("log.createdAt", "DESC");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  queryBuilder.skip((page - 1) * pageSize).take(pageSize);

  const [logs, total] = await queryBuilder.getManyAndCount();

  return { logs, total };
};
