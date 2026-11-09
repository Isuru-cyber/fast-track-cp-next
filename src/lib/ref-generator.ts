export function generateReferenceNumber(bookingDate: Date | string, customerName: string | null | undefined, no: number): string {
  const d = new Date(bookingDate);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const cust = (customerName || '').trim();
  const words = cust.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 0);

  let initials = '';
  if (words.length >= 3) {
    initials = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    initials = words[0][0] + words[1][0];
  } else if (words.length === 1) {
    initials = words[0].slice(0, 3);
  }
  initials = initials.toUpperCase();
  if (!initials) initials = 'UN';

  const paddedNo = String(no).padStart(4, '0');
  return `${yy}${mm}${dd}${initials}${paddedNo}`;
}

/**
 * RFC-4180 compliant CSV cell formatter with Formula Injection protection.
 * - Handles null/undefined -> '""'
 * - Escapes CSV formula triggers (=, +, -, @, \t, \r) by prepending a single quote (')
 * - Escapes internal double quotes (") by doubling them ("")
 * - Encloses the resulting value in double quotes ("...")
 */
export function formatCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str[0])) {
    str = `'` + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str[0])) {
    return `'` + str;
  }
  return str;
}
