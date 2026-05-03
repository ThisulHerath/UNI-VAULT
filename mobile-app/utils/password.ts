// Client-side password validator that mirrors server rules.
export const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'letmein',
  'monkey',
  'dragon',
  '111111',
  'iloveyou',
]);

const hasUpper = (s: string) => /[A-Z]/.test(s);
const hasLower = (s: string) => /[a-z]/.test(s);
const hasDigit = (s: string) => /[0-9]/.test(s);
const hasSpecial = (s: string) => /[^A-Za-z0-9]/.test(s);

const hasSequential = (s: string, runLen = 4) => {
  if (!s || s.length < runLen) return false;
  const seqAlpha = 'abcdefghijklmnopqrstuvwxyz';
  const seqDigits = '0123456789';
  const lower = s.toLowerCase();

  for (let i = 0; i <= lower.length - runLen; i++) {
    const seg = lower.slice(i, i + runLen);
    if (seqAlpha.includes(seg) || seqAlpha.split('').reverse().join('').includes(seg)) return true;
    if (seqDigits.includes(seg) || seqDigits.split('').reverse().join('').includes(seg)) return true;
  }
  return false;
};

const hasRepeated = (s: string, repeatLen = 4) => {
  return new RegExp(`(.)\\1{${repeatLen - 1},}`).test(s);
};

const containsPersonalInfo = (s: string, { name, email }: { name?: string; email?: string } = {}) => {
  const lower = (s || '').toLowerCase();
  const tokens: string[] = [];
  if (name) tokens.push(...name.split(/\s+/));
  if (email) {
    const beforeAt = email.split('@')[0] || '';
    tokens.push(...beforeAt.split(/[._\-+]/));
  }
  return tokens.some((t) => t && t.length >= 3 && lower.includes(t.toLowerCase()));
};

export function validatePassword(
  password: string,
  opts?: { name?: string; email?: string }
): string[] {
  const errors: string[] = [];
  if (!password) {
    errors.push('Password is required.');
    return errors;
  }
  if (password.length < 8) errors.push('Password must be at least 8 characters long.');
  if (!hasUpper(password)) errors.push('Include at least one uppercase letter (A-Z).');
  if (!hasLower(password)) errors.push('Include at least one lowercase letter (a-z).');
  if (!hasDigit(password)) errors.push('Include at least one number (0-9).');
  if (!hasSpecial(password)) errors.push('Include at least one special character (e.g. !@#$%).');
  if (hasSequential(password)) errors.push('Avoid sequential characters like "abcd" or "1234".');
  if (hasRepeated(password)) errors.push('Avoid repeated characters like "aaaa" or "1111".');
  if (containsPersonalInfo(password, opts)) errors.push('Do not use your name, email, or other personal info.');

  const lower = password.toLowerCase();
  for (const common of COMMON_PASSWORDS) {
    if (lower === common || lower.includes(common)) {
      errors.push('Password is too common or easily guessable.');
      break;
    }
  }

  return errors;
}

export default validatePassword;
