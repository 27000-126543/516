import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class PasswordPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  policyName: string;

  @Column({ default: 90 })
  rotationDays: number;

  @Column({ default: 7 })
  reminderDays: number;

  @Column({ default: 8 })
  minLength: number;

  @Column({ default: true })
  requireUppercase: boolean;

  @Column({ default: true })
  requireLowercase: boolean;

  @Column({ default: true })
  requireNumber: boolean;

  @Column({ default: true })
  requireSpecialChar: boolean;

  @Column({ default: 5 })
  historyCount: number;

  @Column({ default: 3 })
  maxFailedAttempts: number;

  @Column({ default: 5 })
  maxAbnormalAttempts: number;

  @Column({ default: 24 })
  disableAfterHours: number;

  @Column({ default: "09:00" })
  workStartTime: string;

  @Column({ default: "18:00" })
  workEndTime: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
