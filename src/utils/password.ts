import zxcvbn from "zxcvbn";
import { config } from "../config";

export interface PasswordStrengthResult {
  score: number;
  strength: "very_weak" | "weak" | "medium" | "strong" | "very_strong";
  suggestions: string[];
  warnings: string[];
  isWeak: boolean;
}

export const checkPasswordStrength = (
  password: string,
  userInputs: string[] = []
): PasswordStrengthResult => {
  const result = zxcvbn(password, userInputs);

  const strengthMap: Record<number, PasswordStrengthResult["strength"]> = {
    0: "very_weak",
    1: "weak",
    2: "medium",
    3: "strong",
    4: "very_strong",
  };

  return {
    score: result.score,
    strength: strengthMap[result.score],
    suggestions: result.feedback.suggestions,
    warnings: result.feedback.warning ? [result.feedback.warning] : [],
    isWeak: result.score <= 1,
  };
};

export const validatePasswordComplexity = (
  password: string,
  policy?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecialChar: boolean;
  }
): { valid: boolean; errors: string[] } => {
  const rules = policy || {
    minLength: config.passwordMinLength,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  };

  const errors: string[] = [];

  if (password.length < rules.minLength) {
    errors.push(`密码长度至少为 ${rules.minLength} 个字符`);
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("密码必须包含大写字母");
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("密码必须包含小写字母");
  }

  if (rules.requireNumber && !/[0-9]/.test(password)) {
    errors.push("密码必须包含数字");
  }

  if (rules.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("密码必须包含特殊字符");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const generateStrongPassword = (length: number = 12): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  const allChars = uppercase + lowercase + numbers + specialChars;
  let password = "";

  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};
