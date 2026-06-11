import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PasswordHistory } from "./PasswordHistory";
import { LoginLog } from "./LoginLog";

export type UserRole = "employee" | "manager" | "director" | "admin";
export type UserStatus = "active" | "disabled" | "frozen" | "pending";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  realName: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  department: string;

  @Column({
    type: "varchar",
    default: "employee",
  })
  role: UserRole;

  @Column({
    type: "varchar",
    default: "active",
  })
  status: UserStatus;

  @Column({ type: "datetime", nullable: true })
  lastPasswordChange: Date;

  @Column({ default: 0 })
  passwordStrengthScore: number;

  @Column({ default: false })
  isWeakPassword: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ default: 0 })
  abnormalLoginCount: number;

  @Column({ type: "datetime", nullable: true })
  frozenAt: Date;

  @Column({ nullable: true })
  supervisorId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PasswordHistory, (history) => history.user)
  passwordHistories: PasswordHistory[];

  @OneToMany(() => LoginLog, (log) => log.user)
  loginLogs: LoginLog[];
}
