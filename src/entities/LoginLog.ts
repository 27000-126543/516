import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export type LoginStatus = "success" | "failed" | "pending_2fa" | "blocked";
export type AbnormalType =
  | "none"
  | "non_working_hours"
  | "unusual_location"
  | "multiple_failures"
  | "new_device";

@Entity()
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  systemId: number;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: "varchar",
    default: "success",
  })
  status: LoginStatus;

  @Column({
    type: "varchar",
    default: "none",
  })
  abnormalType: AbnormalType;

  @Column({ default: false })
  isAbnormal: boolean;

  @Column({ default: false })
  twoFactorVerified: boolean;

  @Column({ nullable: true })
  twoFactorMethod: string;

  @Column({ type: "text", nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.loginLogs)
  @JoinColumn({ name: "userId" })
  user: User;
}
