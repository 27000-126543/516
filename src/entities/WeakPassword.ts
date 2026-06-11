import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class WeakPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  password: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 1 })
  frequency: number;

  @CreateDateColumn()
  createdAt: Date;
}
