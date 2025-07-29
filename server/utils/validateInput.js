// Validate Email
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  if (!email) return { isValid: false, error: "Email is required." };

  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  return { isValid: true, error: null };
}

// Validate Password
export function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}