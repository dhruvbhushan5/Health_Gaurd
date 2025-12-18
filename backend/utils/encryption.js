const crypto = require('crypto');

/**
 * PasswordEncryption class for secure password handling using modern crypto methods
 */
class PasswordEncryption {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.saltLength = 32; // 256 bits
    this.iterations = 100000; // PBKDF2 iterations
    this.hashAlgorithm = 'sha512';
  }

  /**
   * Generate cryptographically secure random salt
   * @returns {Buffer} - Random salt
   */
  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - Plain text password
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Buffer} - Derived key
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, this.hashAlgorithm);
  }

  /**
   * Hash password securely using AES-256-CBC encryption
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} - Base64 encoded encrypted password
   */
  async hashPassword(password) {
    try {
      // Generate random salt and IV
      const salt = this.generateSalt();
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from password and salt
      const key = this.deriveKey(password, salt);
      
      // Create cipher with key and IV
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt the password
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine salt + iv + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);
      
      // Return base64 encoded result
      return combined.toString('base64');
      
    } catch (error) {
      console.error('❌ Password encryption error:', error);
      throw new Error('Password encryption failed');
    }
  }

  /**
   * Compare plain password with encrypted password
   * @param {string} candidatePassword - Plain text password to check
   * @param {string} hashedPassword - Encrypted password from database
   * @returns {boolean} - True if passwords match
   */
  async comparePassword(candidatePassword, hashedPassword) {
    try {
      // Decode the combined data
      const combined = Buffer.from(hashedPassword, 'base64');
      
      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength);
      
      // Derive key from candidate password and extracted salt
      const key = this.deriveKey(candidatePassword, salt);
      
      // Create decipher with key and IV
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // Attempt to decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Compare decrypted password with candidate
      const isMatch = decrypted === candidatePassword;
      
      if (!isMatch) {
        console.log('🔓 Password comparison failed (passwords don\'t match)');
      }
      
      return isMatch;
      
    } catch (error) {
      console.error('❌ Password comparison error:', error);
      return false;
    }
  }

  /**
   * Generate a cryptographically secure random password
   * @param {number} length - Desired password length
   * @returns {string} - Generated secure password
   */
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Ensure password has at least one character from each required category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Add one character from each category
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];
    
    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[crypto.randomInt(charset.length)];
    }
    
    // Shuffle the password to randomize character positions
    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
  }

  /**
   * Validate password strength and provide feedback
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with strength score and feedback
   */
  validatePasswordStrength(password) {
    const result = {
      isValid: false,
      strength: 'weak',
      score: 0,
      suggestions: [],
      criteria: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumbers: false,
        hasSymbols: false,
        noCommonPatterns: true
      }
    };

    // Check minimum length (8 characters)
    if (password.length >= 8) {
      result.criteria.minLength = true;
      result.score += 1;
    } else {
      result.suggestions.push('Use at least 8 characters');
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) {
      result.criteria.hasUppercase = true;
      result.score += 1;
    } else {
      result.suggestions.push('Include uppercase letters');
    }

    // Check for lowercase letters
    if (/[a-z]/.test(password)) {
      result.criteria.hasLowercase = true;
      result.score += 1;
    } else {
      result.suggestions.push('Include lowercase letters');
    }

    // Check for numbers
    if (/\d/.test(password)) {
      result.criteria.hasNumbers = true;
      result.score += 1;
    } else {
      result.suggestions.push('Include numbers');
    }

    // Check for symbols
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      result.criteria.hasSymbols = true;
      result.score += 1;
    } else {
      result.suggestions.push('Include special characters');
    }

    // Check for common patterns
    const commonPatterns = [
      /123456/, /password/, /qwerty/, /abc123/,
      /111111/, /000000/, /admin/, /login/
    ];
    
    for (let pattern of commonPatterns) {
      if (pattern.test(password.toLowerCase())) {
        result.criteria.noCommonPatterns = false;
        result.score = Math.max(0, result.score - 1);
        result.suggestions.push('Avoid common patterns');
        break;
      }
    }

    // Determine strength level
    if (result.score >= 4) {
      result.strength = 'strong';
      result.isValid = true;
    } else if (result.score >= 3) {
      result.strength = 'medium';
      result.isValid = true;
    } else {
      result.strength = 'weak';
      result.isValid = false;
    }

    return result;
  }
}

// Create singleton instance
const passwordEncryption = new PasswordEncryption();

// Export utility functions
module.exports = {
  hashPassword: (password) => passwordEncryption.hashPassword(password),
  comparePassword: (candidatePassword, hashedPassword) => 
    passwordEncryption.comparePassword(candidatePassword, hashedPassword),
  generateSecurePassword: (length) => passwordEncryption.generateSecurePassword(length),
  validatePasswordStrength: (password) => passwordEncryption.validatePasswordStrength(password)
};