export function formatRussianPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`
  digits = digits.slice(0, 11)
  if (!digits) return ''
  if (!digits.startsWith('7')) return `+${digits}`
  const code = digits.slice(1, 4)
  const first = digits.slice(4, 7)
  const second = digits.slice(7, 9)
  const third = digits.slice(9, 11)
  let result = '+7'
  if (code) result += ` ${code}`
  if (first) result += ` ${first}`
  if (second) result += `-${second}`
  if (third) result += `-${third}`
  return result
}
