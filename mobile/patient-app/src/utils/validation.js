/**
 * Validation utilities for MedTranslate AI Mobile App
 */

/**
 * Validates a session code
 * 
 * @param {string} code - The session code to validate
 * @returns {boolean} - Whether the code is valid
 */
export const validateSessionCode = (code) => {
  // Check if code is defined
  if (!code) {
    return false;
  }
  
  // Check if code is a string
  if (typeof code !== 'string') {
    return false;
  }
  
  // Check if code is 6 digits
  return /^\d{6}$/.test(code);
};

/**
 * Validates an email address
 * 
 * @param {string} email - The email address to validate
 * @returns {boolean} - Whether the email is valid
 */
export const validateEmail = (email) => {
  // Check if email is defined
  if (!email) {
    return false;
  }
  
  // Check if email is a string
  if (typeof email !== 'string') {
    return false;
  }
  
  // Check if email is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a password
 * 
 * @param {string} password - The password to validate
 * @returns {object} - Validation result with isValid and message
 */
export const validatePassword = (password) => {
  // Check if password is defined
  if (!password) {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }
  
  // Check if password is a string
  if (typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password must be a string'
    };
  }
  
  // Check if password is at least 8 characters
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters'
    };
  }
  
  // Check if password contains at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  // Check if password contains at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  // Check if password contains at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  // Check if password contains at least one special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character'
    };
  }
  
  // Password is valid
  return {
    isValid: true,
    message: 'Password is valid'
  };
};

/**
 * Validates a name
 * 
 * @param {string} name - The name to validate
 * @returns {boolean} - Whether the name is valid
 */
export const validateName = (name) => {
  // Check if name is defined
  if (!name) {
    return false;
  }
  
  // Check if name is a string
  if (typeof name !== 'string') {
    return false;
  }
  
  // Check if name is not empty
  if (name.trim() === '') {
    return false;
  }
  
  // Check if name is at least 2 characters
  if (name.trim().length < 2) {
    return false;
  }
  
  // Check if name contains only letters, spaces, hyphens, and apostrophes
  return /^[a-zA-Z\s\-']+$/.test(name);
};

/**
 * Validates a phone number
 * 
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const validatePhone = (phone) => {
  // Check if phone is defined
  if (!phone) {
    return false;
  }
  
  // Check if phone is a string
  if (typeof phone !== 'string') {
    return false;
  }
  
  // Check if phone is valid (simple validation for international numbers)
  // This allows for various formats like +1-123-456-7890, (123) 456-7890, 123.456.7890, etc.
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,3}[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,4}$/;
  return phoneRegex.test(phone);
};

/**
 * Validates a date of birth
 * 
 * @param {string} dob - The date of birth to validate (YYYY-MM-DD)
 * @returns {boolean} - Whether the date of birth is valid
 */
export const validateDateOfBirth = (dob) => {
  // Check if dob is defined
  if (!dob) {
    return false;
  }
  
  // Check if dob is a string
  if (typeof dob !== 'string') {
    return false;
  }
  
  // Check if dob is in the format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return false;
  }
  
  // Check if dob is a valid date
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // Check if dob is not in the future
  if (date > new Date()) {
    return false;
  }
  
  // Check if person is not too old (e.g., over 120 years)
  const maxAge = 120;
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - maxAge);
  if (date < minDate) {
    return false;
  }
  
  return true;
};

/**
 * Validates a feedback rating
 * 
 * @param {number} rating - The rating to validate
 * @param {number} maxRating - The maximum rating value (default: 5)
 * @returns {boolean} - Whether the rating is valid
 */
export const validateRating = (rating, maxRating = 5) => {
  // Check if rating is defined
  if (rating === undefined || rating === null) {
    return false;
  }
  
  // Check if rating is a number
  if (typeof rating !== 'number') {
    return false;
  }
  
  // Check if rating is an integer
  if (!Number.isInteger(rating)) {
    return false;
  }
  
  // Check if rating is between 1 and maxRating
  return rating >= 1 && rating <= maxRating;
};
