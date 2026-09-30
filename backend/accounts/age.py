"""Product age rule. This is not a GDPR age limit."""

from datetime import date

MIN_PRODUCT_AGE = 18
MAX_PROFILE_AGE = 120


def completed_years(birth: date, today: date) -> int:
    years = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        years -= 1
    return years


def product_age_message(birth: date, today: date | None = None) -> str | None:
    today = today or date.today()
    if birth > today:
        return "La fecha de nacimiento no puede ser en el futuro"
    age = completed_years(birth, today)
    if age < MIN_PRODUCT_AGE:
        return "Debes tener 18 años o más para crear una cuenta."
    if age > MAX_PROFILE_AGE:
        return "La fecha de nacimiento no es válida"
    return None
