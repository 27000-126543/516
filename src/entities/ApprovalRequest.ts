import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type RequestType = "password_reset" | "account_unlock" | "permission_restore";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type Priority = "low" | "medium" | "high" | "urgent";

@Entity()
export class ApprovalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requesterId: number;

  @Column()
  requesterName: string;

  @Column()
  department: string;

  @Column({
    type: "varchar",
  })
  requestType: RequestType;

  @Column({
    type: "varchar",
    default: "pending",
  })
  status: ApprovalStatus;

  @Column({
    type: "varchar",
    default: "medium",
  })
  priority: Priority;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ nullable: true })
  currentApproverId: number;

  @Column({ nullable: true })
  currentApproverName: string;

  @Column({ type: "int", default: 0 })
  approvalLevel: number;

  @Column({ type: "int", default: 2 })
  totalLevels: number;

  @Column({ type: "text", nullable: true })
  approvalHistory: string;

  @Column({ type: "datetime", nullable: true })
  approvedAt: Date;

  @Column({ type: "datetime", nullable: true })
  rejectedAt: Date;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  relatedAccountId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
