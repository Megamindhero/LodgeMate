// Generate a cryptographically random OTP code
export function generateOTP(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars (0,O,1,I)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Returns expiry timestamp (1 year from now)
export function getOTPExpiry() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

// Check if an OTP is still valid
export function isOTPValid(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt) > new Date()
}

// Format expiry date for display
export function formatExpiry(expiresAt) {
  if (!expiresAt) return 'Unknown'
  return new Date(expiresAt).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}
