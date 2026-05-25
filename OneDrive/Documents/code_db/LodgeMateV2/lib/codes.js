// Generate a 10-digit landlord access code (numeric only, easy to share verbally)
export function generateLandlordCode() {
  let code = '';
  for (let i = 0; i < 10; i++) code += Math.floor(Math.random() * 10).toString();
  return code;
}

// Format code for display: 1234-567-890
export function formatLandlordCode(code) {
  if (!code) return '';
  return `${code.slice(0,4)}-${code.slice(4,7)}-${code.slice(7,10)}`;
}

// Strip formatting back to raw digits
export function stripLandlordCode(input) {
  return input.replace(/[^0-9]/g, '').slice(0, 10);
}

export function isLandlordCodeValid(code) {
  return typeof code === 'string' && code.replace(/[^0-9]/g,'').length === 10;
}
