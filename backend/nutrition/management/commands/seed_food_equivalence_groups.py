import re
import unicodedata

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from nutrition.models import Food, FoodEquivalenceGroup


GROUP_RULES = [
    ("Pan de molde y panes", "panes", ["pan", "molde", "sandwich", "bikini", "tostada", "bagel", "pita", "bocadillo", "bocata", "chapata"]),
    ("Wraps y tortillas", "wraps-tortillas", ["wrap", "fajita", "taco", "tortilla trigo", "tortilla maiz", "tortilla integral"]),
    ("Arroces", "arroces", ["arroz", "rice", "basmati"]),
    ("Pastas", "pastas", ["pasta", "macarron", "macarrones", "espagueti", "espaguetis", "noodle", "noodles"]),
    ("Avenas y cereales", "avenas-cereales", ["avena", "cereal", "cereales", "granola", "muesli"]),
    ("Carnes", "carnes", ["pollo", "pavo", "ternera", "cerdo", "lomo", "solomillo", "carne", "beef", "chicken"]),
    ("Pescados", "pescados", ["salmon", "atun", "merluza", "bacalao", "sardina", "trucha", "pescado"]),
    ("Marisco", "marisco", ["gamba", "langostino", "camaron", "mejillon", "almeja", "marisco"]),
    ("Huevos", "huevos", ["huevo", "clara", "omelette"]),
    ("Legumbres", "legumbres", ["lenteja", "garbanzo", "alubia", "judia", "frijol", "legumbre"]),
    ("Fruta", "fruta", ["manzana", "platano", "banana", "fresa", "kiwi", "naranja", "pera", "mango", "fruta"]),
    ("Verduras", "verduras", ["brocoli", "calabacin", "lechuga", "tomate", "zanahoria", "pepino", "espinaca", "verdura"]),
    ("Lacteos", "lacteos", ["yogur", "queso", "leche", "skyr", "kefir"]),
    ("Frutos secos", "frutos-secos", ["almendra", "nuez", "cacahuete", "pistacho", "avellana", "anacardo"]),
    ("Grasas y aceites", "grasas-aceites", ["aceite", "aove", "oliva", "aguacate", "mantequilla"]),
]

CATEGORY_TO_GROUP = {
    "carnes": "carnes",
    "pescados": "pescados",
    "marisco": "marisco",
    "huevos": "huevos",
    "legumbres": "legumbres",
    "fruta": "fruta",
    "verduras": "verduras",
    "lacteos": "lacteos",
    "frutos_secos": "frutos-secos",
    "grasas": "grasas-aceites",
}


def normalize_text(value):
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9\s_-]", " ", text.lower())
    return " ".join(text.replace("_", " ").replace("-", " ").split())


def keyword_matches(source, keyword):
    keyword = normalize_text(keyword)
    if not keyword:
        return False
    return re.search(rf"(^|\s){re.escape(keyword)}(\s|$)", source) is not None


class Command(BaseCommand):
    help = "Crea grupos personalizados de equivalencias y asigna alimentos existentes."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Guarda cambios. Sin esto solo muestra preview.")
        parser.add_argument("--clear", action="store_true", help="Limpia grupos actuales antes de reasignar.")
        parser.add_argument("--limit", type=int, default=0, help="Limita alimentos procesados.")

    def handle(self, *args, **options):
        apply_changes = bool(options["apply"])
        clear = bool(options["clear"])
        limit = int(options["limit"] or 0)

        group_labels = {slugify(slug): name for name, slug, _keywords in GROUP_RULES}
        groups_by_slug = {}
        if apply_changes:
            for name, slug, _keywords in GROUP_RULES:
                group, _created = FoodEquivalenceGroup.objects.get_or_create(
                    slug=slugify(slug),
                    defaults={"name": name, "description": "Grupo inicial generado automaticamente."},
                )
                groups_by_slug[group.slug] = group

        foods = Food.objects.all().order_by("name")
        if limit > 0:
            foods = foods[:limit]

        planned = []
        for food in foods:
            source = normalize_text(" ".join([food.name, food.brand, food.category]))
            slugs = []

            for _name, slug, keywords in GROUP_RULES:
                if any(keyword_matches(source, keyword) for keyword in keywords):
                    slugs.append(slugify(slug))

            fallback_slug = CATEGORY_TO_GROUP.get(food.equivalence_category or "")
            if fallback_slug and fallback_slug not in slugs:
                slugs.append(fallback_slug)

            if slugs:
                planned.append((food, [slug for slug in slugs if slug in group_labels]))

        self.stdout.write("\nGrupos de equivalencia personalizados")
        self.stdout.write(f"- Alimentos con grupos asignables: {len(planned)}")
        for food, group_slugs in planned[:50]:
            self.stdout.write(f"  - {food.name}: {', '.join(group_labels[slug] for slug in group_slugs)}")
        if len(planned) > 50:
            self.stdout.write(f"  ... y {len(planned) - 50} mas")

        if not apply_changes:
            self.stdout.write(self.style.WARNING("\nDry-run completado. Usa --apply para guardar cambios."))
            return

        for food, group_slugs in planned:
            if clear:
                food.equivalence_groups.clear()
            groups = [groups_by_slug[slug] for slug in group_slugs if slug in groups_by_slug]
            food.equivalence_groups.add(*groups)

        self.stdout.write(self.style.SUCCESS(f"\nAsignados grupos a {len(planned)} alimentos."))
