/**
 * Client-side validation utilities for ParkEase authentication forms.
 *
 * Rules:
 * - Email: non-empty, standard email format
 * - Password: minimum 8 characters (matches standard security practices)
 * - Name: minimum 2 characters
 * - Phone: minimum 10 digits
 * - Confirm Password: exact match with password
 * - Terms: must be accepted (boolean true)
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_CLEAN_REGEX = /[\s\-()+]/g;

/**
 * Validates an email address.
 * @param {string} email
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  const value = typeof email === "string" ? email.trim() : "";
  if (!value) {
    return "Email address is required.";
  }
  if (!EMAIL_REGEX.test(value)) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  return null;
}

/**
 * Validates a password.
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export function validatePassword(password) {
  const value = typeof password === "string" ? password : "";
  if (!value) {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return null;
}

/**
 * Validates a full name.
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
export function validateName(name) {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) {
    return "Full name is required.";
  }
  if (value.length < 2) {
    return "Full name must be at least 2 characters long.";
  }
  return null;
}

/**
 * Validates a phone number.
 * @param {string} phone
 * @returns {string|null} Error message or null if valid
 */
export function validatePhone(phone) {
  const value = typeof phone === "string" ? phone.trim() : "";
  if (!value) {
    return "Phone number is required.";
  }
  const digitsOnly = value.replace(PHONE_CLEAN_REGEX, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15 || !/^\d+$/.test(digitsOnly)) {
    return "Please enter a valid phone number (at least 10 digits).";
  }
  return null;
}

/**
 * Validates password confirmation matching.
 * @param {string} confirmPassword
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export function validateConfirmPassword(confirmPassword, password) {
  const value = typeof confirmPassword === "string" ? confirmPassword : "";
  if (!value) {
    return "Please confirm your password.";
  }
  if (value !== password) {
    return "Passwords do not match.";
  }
  return null;
}

/**
 * Validates terms and conditions acceptance.
 * @param {boolean} agreeTerms
 * @returns {string|null} Error message or null if valid
 */
export function validateTerms(agreeTerms) {
  if (!agreeTerms) {
    return "You must accept the Terms of Service to continue.";
  }
  return null;
}

/**
 * Validates the full Login form payload.
 * @param {{ email?: string, password?: string }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateLoginForm(data = {}) {
  const errors = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the full Registration form payload.
 * @param {{ name?: string, email?: string, phone?: string, password?: string, confirmPassword?: string, agreeTerms?: boolean }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateRegisterForm(data = {}) {
  const errors = {};

  const nameError = validateName(data.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(data.phone);
  if (phoneError) errors.phone = phoneError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  const confirmError = validateConfirmPassword(data.confirmPassword, data.password);
  if (confirmError) errors.confirmPassword = confirmError;

  const termsError = validateTerms(data.agreeTerms);
  if (termsError) errors.agreeTerms = termsError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
