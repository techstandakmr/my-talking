export function validateEmail(email) {
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

export function validatePassword(password) {
    const isValid =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!password) {
        return {
            isValid: false,
            error: "Password is required.",
        };
    }

    if (!isValid) {
        return {
            isValid: false,
            error:
                "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
        };
    }

    return {
        isValid: true,
        error: null,
    };
}

export function validateOTP(otp) {
    const otpRegex = /^\d{6}$/;

    if (!otp) {
        return {
            isValid: false,
            error: "OTP is required.",
        };
    }

    if (!otpRegex.test(otp)) {
        return {
            isValid: false,
            error: "OTP must be a 6-digit number.",
        };
    }

    return {
        isValid: true,
        error: null,
    };
}

export function validateName(name) {
    const nameRegex = /^[A-Za-z ]{3,}$/;

    if (!name) {
        return {
            isValid: false,
            error: "Name is required.",
        };
    }

    if (!nameRegex.test(name)) {
        return {
            isValid: false,
            error: "Name must contain only letters and be at least 3 characters.",
        };
    }

    return {
        isValid: true,
        error: null,
    };
}

export function validateTitle(title) {
    const titleRegex = /^[A-Za-z ]{6,}$/;

    if (!title) {
        return {
            isValid: false,
            error: "Title is required.",
        };
    }

    if (!titleRegex.test(title)) {
        return {
            isValid: false,
            error: "Title must contain only letters and be at least 6 characters.",
        };
    }

    return {
        isValid: true,
        error: null,
    };
}

export function validateComment(comment) {
    const commentRegex = /^[A-Za-z ]{15,}$/;

    if (!comment) {
        return {
            isValid: false,
            error: "Comment is required.",
        };
    }

    if (!commentRegex.test(comment)) {
        return {
            isValid: false,
            error: "Comment must contain only letters and be at least 15 characters.",
        };
    }

    return {
        isValid: true,
        error: null,
    };
}
