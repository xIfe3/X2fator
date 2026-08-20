export interface PasswordCheck {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const passwordChecks: PasswordCheck[] = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "number", label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { key: "symbol", label: "One symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export type PasswordStrengthLabel = "Too weak" | "Weak" | "Fair" | "Strong";

export function scorePassword(pw: string): { score: number; label: PasswordStrengthLabel; passed: string[] } {
  const passed = passwordChecks.filter((c) => c.test(pw)).map((c) => c.key);
  const score = passed.length;
  const label: PasswordStrengthLabel =
    pw.length === 0 ? "Too weak" : score <= 1 ? "Weak" : score === 2 || score === 3 ? "Fair" : "Strong";
  return { score, label, passed };
}

/** Minimum bar to submit — mirrors the backend's @MinLength(8). Strength
 * beyond this is encouraged via the meter but never blocks submission. */
export function isPasswordValid(pw: string): boolean {
  return pw.length >= 8;
}
