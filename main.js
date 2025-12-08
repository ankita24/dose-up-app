const formatPhoneNumber = (text: string): string => {
  // Remove all non-digits
  const cleaned = text.replace(/\D/g, '');

  // Format as +91 XXXXX XXXXX (Indian format - user enters 10 digits only)
  if (cleaned.length === 0) return '+91 ';
  if (cleaned.length <= 5) return `+91 ${cleaned}`;
  return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`;
};
