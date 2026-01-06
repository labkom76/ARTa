import { format } from 'date-fns';

// Helper function to extract the code from Jenis Tagihan full description
export const getJenisTagihanCode = (fullDescription: string): string => {
  const match = fullDescription.match(/\(([^)]+)\)/);
  return match ? match[1] : fullDescription; // Fallback to full description if no code found
};

// Function to generate Nomor SPM
export const generateNomorSpm = (
  jenisTagihanFull: string,
  kodeJadwal: string,
  currentKodeSkpd: string,
  currentKodeWilayah: string,
  nomorUrutTagihan: number
): string | null => {
  if (!jenisTagihanFull || !kodeJadwal || !currentKodeSkpd || !currentKodeWilayah || nomorUrutTagihan === null || nomorUrutTagihan === undefined) {
    return null;
  }

  const jenisTagihanCode = getJenisTagihanCode(jenisTagihanFull);

  const now = new Date();
  const currentMonth = format(now, 'M');
  const currentYear = format(now, 'yyyy');

  const formattedSequence = String(nomorUrutTagihan).padStart(6, '0'); // Pad with 6 zeros

  // Final SPM string construction
  return `${currentKodeWilayah}/${formattedSequence}/${jenisTagihanCode}/${currentKodeSkpd}/${kodeJadwal}/${currentMonth}/${currentYear}`;
};