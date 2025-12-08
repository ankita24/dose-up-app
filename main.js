const formatPhoneNumber = (text: string): string => {
  // Remove all non-digits
  const cleaned = text.replace(/\D/g, '');

  // Format as +91 XXXXX XXXXX (Indian format)
  if (cleaned.length <= 2) return cleaned.length > 0 ? `+${cleaned}` : '';
  if (cleaned.length <= 7) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
};

console.log(formatPhoneNumber("919876543210")); // +91 98765 43210
