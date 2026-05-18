export function normalizeNamePart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split('-')
    .map((part) => part ? `${part[0].toLocaleUpperCase('ru-RU')}${part.slice(1).toLocaleLowerCase('ru-RU')}` : '')
    .join('-')
}

export function normalizePersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(normalizeNamePart)
    .join(' ')
}
