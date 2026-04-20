export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return 'Unknown'
  const clean = raw.replace('whatsapp:', '')
  if (clean.length <= 8) return clean
  return `${clean.slice(0, 5)}•••${clean.slice(-4)}`
}
