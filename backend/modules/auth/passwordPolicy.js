// Centralized password policy checks for server-side validation
const COMMON_PASSWORDS = new Set([
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

const hasUpper = (s) => /[A-Z]/.test(s);
const hasLower = (s) => /[a-z]/.test(s);
const hasDigit = (s) => /[0-9]/.test(s);
const hasSpecial = (s) => /[^A-Za-z0-9]/.test(s);

// Detect sequential runs of letters or digits length >= 4
const hasSequential = (s, runLen = 4) => {
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

// Detect repeated character 4 or more times
const hasRepeated = (s, repeatLen = 4) => {
  return new RegExp(`(.)\\1{${repeatLen - 1},}`).test(s);
};

// Check for personal info substrings of length >=3
const containsPersonalInfo = (s, { name, email } = {}) => {
  const lower = (s || '').toLowerCase();
  const tokens = [];
  if (name) tokens.push(...name.split(/\s+/));
  if (email) {
    const beforeAt = email.split('@')[0] || '';
    tokens.push(...beforeAt.split(/[._\-+]/));
  }
  return tokens.some((t) => t && t.length >= 3 && lower.includes(t.toLowerCase()));
};

const checkPassword = (value, { req }) => {
  const pwd = value || '';
  const errors = [];

  if (pwd.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!hasUpper(pwd)) errors.push('Password must include at least one uppercase letter (A-Z).');
  if (!hasLower(pwd)) errors.push('Password must include at least one lowercase letter (a-z).');
  if (!hasDigit(pwd)) errors.push('Password must include at least one number (0-9).');
  if (!hasSpecial(pwd)) errors.push('Password must include at least one special character (e.g. !@#$%).');
  if (hasSequential(pwd)) errors.push('Password must not contain sequential characters like "abcd" or "1234".');
  if (hasRepeated(pwd)) errors.push('Password must not contain repeated characters like "aaaa" or "1111".');

  const name = req.body?.name || req.user?.name || '';
  const email = req.body?.email || req.user?.email || '';
  if (containsPersonalInfo(pwd, { name, email })) {
    errors.push('Password must not contain your name, email, or other personal information.');
  }

  const lower = pwd.toLowerCase();
  for (const common of COMMON_PASSWORDS) {
    if (lower === common || lower.includes(common)) {
      errors.push('Password is too common or easily guessable.');
      break;
    }
  }

  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  return true;
};

module.exports = {
  checkPassword,
};
