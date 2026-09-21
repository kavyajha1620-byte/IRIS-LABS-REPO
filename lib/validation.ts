const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const WHITESPACE_WITHIN = /[\s_-]/g;

export function normalizePhone(value: string) {
  return (value ?? "").replace(/[\s().-]/g, "").trim();
}

export function normalizeEmail(value: string) {
  return (value ?? "").trim().toLowerCase();
}

export function isEmail(value: string) {
  return EMAIL_RE.test(value);
}

export function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function validatePhone(value: string) {
  return isPhone(value);
}

export function validateEmail(value: string) {
  return isEmail(value);
}

export { WHITESPACE_WITHIN };