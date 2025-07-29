function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  if (!email) {
    return {
      isValid: false,
      error: "Email is required.",
    };
  }

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: "Please enter a valid email address.",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

export default validateEmail;