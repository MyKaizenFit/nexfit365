"""
Cliente para OpenFoodFacts API - Base de datos de alimentos gratuita y open source.
https://world.openfoodfacts.org/data
"""
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests


OPENFOODFACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OPENFOODFACTS_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product"


@dataclass
class ParsedNutrients:
    """Datos nutricionales parseados de OpenFoodFacts"""
    serving_size: Optional[float]
    serving_unit: Optional[str]
    calories: Optional[int]
    fat: Optional[float]
    carbs: Optional[float]
    protein: Optional[float]
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None


class OpenFoodFactsClient:
    """Cliente para buscar alimentos en OpenFoodFacts (gratuito, sin autenticación)"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "NexFit365-App/1.0 (nutrition tracking)"
        })

    def search_foods(
        self,
        search_expression: str,
        page: int = 1,
        page_size: int = 20,
        country: str = "spain",
        language: str = "es",
    ) -> Dict[str, Any]:
        """
        Busca alimentos en OpenFoodFacts.
        
        Args:
            search_expression: Término de búsqueda
            page: Número de página (1-indexed)
            page_size: Resultados por página
            country: País para filtrar (spain, world, etc.)
            language: Idioma (es, en, etc.)
        
        Returns:
            Dict con 'count', 'page', 'page_size', 'products'
        """
        params = {
            "search_terms": search_expression,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page": page,
            "page_size": page_size,
            "lc": language,
            "cc": country[:2].lower(),  # ES para Spain
            "fields": "code,product_name,brands,nutriments,serving_size,image_url,categories_tags",
        }
        
        response = self.session.get(
            OPENFOODFACTS_SEARCH_URL,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "count": data.get("count", 0),
            "page": data.get("page", page),
            "page_size": data.get("page_size", page_size),
            "products": data.get("products", []),
        }

    def get_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Obtiene un producto por código de barras"""
        response = self.session.get(
            f"{OPENFOODFACTS_PRODUCT_URL}/{barcode}.json",
            timeout=30,
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") != 1:
            return None
        return data.get("product")

    @staticmethod
    def parse_nutrients(product: Dict[str, Any]) -> ParsedNutrients:
        """
        Extrae los nutrientes de un producto de OpenFoodFacts.
        Los valores son por 100g por defecto.
        """
        nutriments = product.get("nutriments", {})
        serving_size_str = product.get("serving_size", "100g")
        
        # Parsear serving_size (ej: "100g", "1 porción (30g)", "250ml")
        serving_size = 100.0
        serving_unit = "g"
        
        if serving_size_str:
            match = re.search(r"(\d+(?:\.\d+)?)\s*(g|ml|kg|l)", serving_size_str.lower())
            if match:
                serving_size = float(match.group(1))
                serving_unit = match.group(2)
        
        def safe_float(key: str, per_100_key: str = None) -> Optional[float]:
            """Obtiene valor float de nutriments, priorizando per_serving si existe"""
            val = nutriments.get(key)
            if val is None and per_100_key:
                val = nutriments.get(per_100_key)
            if val is not None:
                try:
                    return round(float(val), 2)
                except (ValueError, TypeError):
                    pass
            return None
        
        return ParsedNutrients(
            serving_size=serving_size,
            serving_unit=serving_unit,
            calories=int(safe_float("energy-kcal_100g") or safe_float("energy-kcal") or 0),
            fat=safe_float("fat_100g") or safe_float("fat"),
            carbs=safe_float("carbohydrates_100g") or safe_float("carbohydrates"),
            protein=safe_float("proteins_100g") or safe_float("proteins"),
            fiber=safe_float("fiber_100g") or safe_float("fiber"),
            sugar=safe_float("sugars_100g") or safe_float("sugars"),
            sodium=safe_float("sodium_100g") or safe_float("sodium"),
        )

    @staticmethod
    def get_food_name(product: Dict[str, Any], language: str = "es") -> str:
        """Obtiene el nombre del producto, priorizando el idioma especificado"""
        # Intentar nombre localizado
        name = product.get(f"product_name_{language}")
        if not name:
            name = product.get("product_name")
        if not name:
            name = product.get("product_name_en", "")
        
        # Añadir marca si existe
        brand = product.get("brands", "")
        if brand and name and brand.lower() not in name.lower():
            return f"{name} ({brand})"
        
        return name or "Sin nombre"


# Alias para compatibilidad
FoodDatabaseClient = OpenFoodFactsClient
