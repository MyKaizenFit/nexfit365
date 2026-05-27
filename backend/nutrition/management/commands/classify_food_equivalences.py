import re
import unicodedata
from collections import Counter, defaultdict

from django.core.management.base import BaseCommand

from nutrition.models import Food


EQUIVALENCE_CATEGORIES = {
    "carnes": [
        "pollo", "pavo", "ternera", "cerdo", "lomo", "solomillo", "carne", "beef",
        "chicken", "turkey", "pork", "ham", "jamon", "bacon", "hamburguesa",
    ],
    "pescados": [
        "salmon", "atun", "atún", "merluza", "bacalao", "sardina", "trucha",
        "caballa", "pescado", "fish", "tuna", "cod", "hake",
    ],
    "marisco": [
        "gamba", "gambas", "langostino", "langostinos", "camaron", "camarones",
        "marisco", "mejillon", "mejillones", "almeja", "almejas", "cangrejo",
        "crab", "lobster", "shrimp", "shellfish",
    ],
    "huevos": ["huevo", "huevos", "clara", "claras", "egg", "eggs", "omelette", "tortilla"],
    "arroz_cereales": [
        "arroz", "pasta", "macarron", "macarrones", "espagueti", "espaguetis",
        "avena", "quinoa", "cuscus", "couscous", "pan", "tostada", "cereal",
        "cereales", "harina", "tortilla de trigo", "noodle", "noodles", "rice",
    ],
    "legumbres": [
        "lenteja", "lentejas", "garbanzo", "garbanzos", "alubia", "alubias",
        "judia", "judias", "frijol", "frijoles", "legumbre", "legumbres",
        "chickpea", "lentil", "beans",
    ],
    "fruta": [
        "manzana", "platano", "plátano", "banana", "fresa", "fresas", "kiwi",
        "naranja", "pera", "melon", "melón", "sandia", "sandía", "uva", "uvas",
        "mango", "piña", "pina", "fruta", "fruit",
    ],
    "verduras": [
        "brocoli", "brócoli", "calabacin", "calabacín", "lechuga", "tomate",
        "zanahoria", "pepino", "espinaca", "espinacas", "pimiento", "cebolla",
        "acelga", "acelgas", "alcachofa", "alcachofas", "ajo", "albahaca",
        "verdura", "verduras", "hortaliza", "hortalizas", "vegetable", "vegetables",
    ],
    "lacteos": [
        "yogur", "yogurt", "queso", "leche", "lacteo", "lácteo", "lacteos",
        "lácteos", "skyr", "kefir", "kéfir", "milk", "cheese",
    ],
    "frutos_secos": [
        "almendra", "almendras", "nuez", "nueces", "cacahuete", "cacahuetes",
        "pistacho", "pistachos", "avellana", "avellanas", "anacardo", "anacardos",
        "peanut", "almond", "walnut", "cashew", "nuts",
    ],
    "grasas": [
        "aceite", "aove", "oliva", "aguacate", "mantequilla", "margarina",
        "mayonesa", "alioli", "butter", "oil", "avocado",
    ],
}


ALLERGEN_KEYWORDS = {
    "gluten": [
        "gluten", "trigo", "wheat", "harina", "pan", "bread", "pasta", "couscous",
        "cuscus", "cebada", "barley", "centeno", "rye", "avena", "oats", "malta",
        "semola", "sémola", "noodle", "noodles", "macarron", "macarrones",
    ],
    "dairy": [
        "leche", "milk", "queso", "cheese", "yogur", "yogurt", "mantequilla",
        "butter", "nata", "cream", "lactosa", "lactose", "whey", "caseina",
        "caseína", "lacteo", "lácteo", "skyr", "kefir", "kéfir",
    ],
    "eggs": ["huevo", "huevos", "egg", "eggs", "mayonesa", "mayo", "omelette"],
    "nuts": [
        "almendra", "almendras", "almond", "nuez", "nueces", "walnut", "avellana",
        "hazelnut", "pistacho", "pistachio", "cacahuete", "cacahuetes", "peanut",
        "mani", "anacardo", "cashew", "macadamia", "pecan",
    ],
    "soy": ["soja", "soy", "soya", "tofu", "tempeh", "edamame", "miso"],
    "fish": [
        "pescado", "fish", "salmon", "salmón", "atun", "atún", "tuna", "bacalao",
        "merluza", "trucha", "sardina", "caballa",
    ],
    "shellfish": [
        "marisco", "shellfish", "gamba", "gambas", "langostino", "langostinos",
        "camaron", "camarones", "cangrejo", "crab", "langosta", "lobster",
        "mejillon", "mejillones", "almeja", "almejas", "ostra", "shrimp",
    ],
    "sesame": ["sesamo", "sésamo", "sesame", "ajonjoli", "ajonjolí", "tahini"],
}


def normalize_text(value):
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9\s_-]", " ", text).lower()
    return " ".join(text.replace("_", " ").replace("-", " ").split())


def keyword_matches(source, keyword):
    normalized_keyword = normalize_text(keyword)
    if not normalized_keyword:
        return False
    pattern = rf"(^|\s){re.escape(normalized_keyword)}(\s|$)"
    return re.search(pattern, source) is not None


def is_plant_based_milk_or_drink(source):
    plant_drink_markers = [
        "leche de coco", "leche de almendra", "leche de avellana", "leche de avena",
        "leche de soja", "bebida vegetal", "bebida de almendra", "bebida de avellana",
        "bebida de avena", "bebida de soja", "bebida de coco",
    ]
    return any(marker in source for marker in plant_drink_markers)


def classify_equivalence(food):
    source = normalize_text(" ".join([food.name, food.brand, food.category]))
    if not source:
        return ""

    if is_plant_based_milk_or_drink(source):
        return "otros"

    category_text = normalize_text(food.category)
    category_aliases = {
        "meat": "carnes",
        "meats": "carnes",
        "poultry": "carnes",
        "beef": "carnes",
        "pork": "carnes",
        "shellfish": "marisco",
        "fish": "pescados",
        "seafood": "pescados",
        "eggs": "huevos",
        "cereal": "arroz_cereales",
        "cereals": "arroz_cereales",
        "grain": "arroz_cereales",
        "grains": "arroz_cereales",
        "legumes": "legumbres",
        "fruit": "fruta",
        "fruits": "fruta",
        "vegetables": "verduras",
        "dairy": "lacteos",
        "nuts": "frutos_secos",
        "fats": "grasas",
        "oils": "grasas",
    }
    for alias, category in category_aliases.items():
        if alias in category_text:
            return category

    for category, keywords in EQUIVALENCE_CATEGORIES.items():
        if any(keyword_matches(source, keyword) for keyword in keywords):
            return category

    return "otros"


def infer_allergens(food):
    source = normalize_text(" ".join([food.name, food.brand, food.category]))
    inferred = []
    for allergen, keywords in ALLERGEN_KEYWORDS.items():
        if any(keyword_matches(source, keyword) for keyword in keywords):
            if allergen == "dairy" and any(
                phrase in source
                for phrase in [
                    "leche de coco", "leche de almendra", "leche de avellana",
                    "leche de avena", "leche de soja", "bebida vegetal", "bebida de",
                ]
            ):
                continue
            inferred.append(allergen)
    return inferred


class Command(BaseCommand):
    help = "Clasifica automaticamente alimentos existentes por equivalencia y alergenos."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Aplica cambios. Sin esto solo muestra un preview.")
        parser.add_argument("--overwrite", action="store_true", help="Recalcula equivalencias aunque ya tengan valor manual.")
        parser.add_argument("--overwrite-allergens", action="store_true", help="Reemplaza alergenos existentes en vez de fusionarlos.")
        parser.add_argument("--limit", type=int, default=0, help="Limita el numero de alimentos procesados.")

    def handle(self, *args, **options):
        apply_changes = bool(options["apply"])
        overwrite = bool(options["overwrite"])
        overwrite_allergens = bool(options["overwrite_allergens"])
        limit = int(options["limit"] or 0)

        queryset = Food.objects.all().only(
            "id", "name", "brand", "category", "equivalence_category", "allergens"
        ).order_by("name")
        if limit > 0:
            queryset = queryset[:limit]

        equivalence_updates = []
        allergen_updates = []
        equivalence_counts = Counter()
        allergen_counts = Counter()
        examples = defaultdict(list)

        for food in queryset:
            new_category = classify_equivalence(food)
            existing_category = food.equivalence_category or ""
            should_update_category = bool(new_category) and (overwrite or not existing_category)

            current_allergens = food.allergens if isinstance(food.allergens, list) else []
            inferred_allergens = infer_allergens(food)
            if overwrite_allergens:
                new_allergens = inferred_allergens
            else:
                new_allergens = list(dict.fromkeys(current_allergens + inferred_allergens))
            should_update_allergens = new_allergens != current_allergens

            if should_update_category:
                equivalence_updates.append((food, existing_category, new_category))
                equivalence_counts[new_category] += 1
                if len(examples[new_category]) < 5:
                    examples[new_category].append(food.name)

            if should_update_allergens:
                allergen_updates.append((food, current_allergens, new_allergens))
                for allergen in set(new_allergens) - set(current_allergens):
                    allergen_counts[allergen] += 1

            if apply_changes and (should_update_category or should_update_allergens):
                update_fields = ["updated_at"]
                if should_update_category:
                    food.equivalence_category = new_category
                    update_fields.append("equivalence_category")
                if should_update_allergens:
                    food.allergens = new_allergens
                    update_fields.append("allergens")
                food.save(update_fields=update_fields)

        self.stdout.write(self.style.WARNING("\nClasificacion automatica de alimentos"))
        self.stdout.write(f"- Equivalencias actualizables: {len(equivalence_updates)}")
        self.stdout.write(f"- Alergenos actualizables: {len(allergen_updates)}")

        if equivalence_counts:
            self.stdout.write("\nEquivalencias por grupo:")
            for category, count in equivalence_counts.most_common():
                sample = ", ".join(examples[category])
                self.stdout.write(f"  - {category}: {count} ({sample})")

        if allergen_counts:
            self.stdout.write("\nAlergenos detectados:")
            for allergen, count in allergen_counts.most_common():
                self.stdout.write(f"  - {allergen}: {count}")

        if apply_changes:
            self.stdout.write(self.style.SUCCESS("\nCambios aplicados correctamente."))
        else:
            self.stdout.write(self.style.WARNING("\nDry-run completado. Usa --apply para persistir cambios."))
