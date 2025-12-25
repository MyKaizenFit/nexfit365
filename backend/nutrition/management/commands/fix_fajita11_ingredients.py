"""
Comando para corregir los ingredientes de FAJITA 11 que están mezclados con otras recetas
"""
from django.core.management.base import BaseCommand
from nutrition.models import Recipe


class Command(BaseCommand):
    help = 'Corrige los ingredientes de FAJITA 11 eliminando ingredientes de otras recetas'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔧 CORRIGIENDO INGREDIENTES DE FAJITA 11"))
        self.stdout.write("=" * 70 + "\n")
        
        try:
            recipe = Recipe.objects.get(name="FAJITA 11 - Kebab de Pollo y Salsa de Yogur", is_active=True)
            
            self.stdout.write(f"📋 Receta encontrada: {recipe.name}")
            self.stdout.write(f"   Ingredientes actuales: {len(recipe.ingredients) if recipe.ingredients else 0}")
            
            # Ingredientes correctos para FAJITA 11 - Kebab de Pollo y Salsa de Yogur
            correct_ingredients = [
                "150 g pollo en tiras",
                "60 g lechuga o repollo",
                "40 g tomate",
                "40 g pepino",
                "20 g pimiento rojo (clave para hierro  vit C)",
                "50 g yogur natural sin azúcar",
                "Zumo de limón ( vitamina C)",
                "1 pizca de ajo en polvo",
                "1 pizca sal  comino  cúrcuma  pimienta negra  pimentón dulce",
                "1 chorrito de agua para textura",
                "10 g de AOVE",
                "Tortilla integral o de trigo sarraceno (de ser posible) (60-70 g)"
            ]
            
            # Convertir a formato de la base de datos
            ingredients_list = [{"raw": ing} for ing in correct_ingredients]
            
            # Guardar ingredientes corregidos
            recipe.ingredients = ingredients_list
            recipe.save()
            
            self.stdout.write(self.style.SUCCESS(f"✅ Ingredientes corregidos"))
            self.stdout.write(f"   Nuevos ingredientes: {len(ingredients_list)}")
            self.stdout.write("\n   Ingredientes:")
            for i, ing in enumerate(correct_ingredients, 1):
                self.stdout.write(f"   {i}. {ing}")
            
            self.stdout.write("\n" + "=" * 70)
            self.stdout.write(self.style.SUCCESS("✅ Corrección completada"))
            self.stdout.write("=" * 70)
            
        except Recipe.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ No se encontró la receta FAJITA 11"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))






