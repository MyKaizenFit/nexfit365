export const MIN_PRODUCT_AGE = 18
export const MAX_PROFILE_AGE = 120

export function completedYears(birthIso: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const birth = new Date(year, month - 1, day)
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return null
  }
  let years = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    years -= 1
  }
  return years
}

function localIso(today: Date): string {
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

export function productAgeMessage(birthIso: string, today = new Date()): string | null {
  const age = completedYears(birthIso, today)
  if (age === null) return 'La fecha de nacimiento no es válida'
  if (birthIso > localIso(today)) {
    return 'La fecha de nacimiento no puede ser en el futuro'
  }
  if (age < MIN_PRODUCT_AGE) return 'Debes tener 18 años o más para crear una cuenta.'
  if (age > MAX_PROFILE_AGE) return 'La fecha de nacimiento no es válida'
  return null
}
