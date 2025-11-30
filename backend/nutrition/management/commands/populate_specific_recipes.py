from django.core.management.base import BaseCommand
from nutrition.models import Recipe

class Command(BaseCommand):
    help = 'Agrega recetas específicas y bien categorizadas'

    def handle(self, *args, **options):
        # DESAYUNOS ESPECÍFICOS
        breakfasts = [
            {'name': 'Avena cocida con plátano', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 10, 'servings': 1, 'calories_per_serving': 320,
             'ingredients': ['Avena 60g', 'Plátano 1', 'Leche 200ml', 'Canela', 'Miel'],
             'instructions': 'Cocinar avena con leche. Agregar plátano en rodajas y canela. Endulzar con miel.',
             'tags': ['saludable', 'energético', 'fibra']},
            
            {'name': 'Tostadas integrales con huevo', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 8, 'servings': 2, 'calories_per_serving': 280,
             'ingredients': ['Pan integral 2 rebanadas', 'Huevo 2', 'Tomate', 'Aceite de oliva'],
             'instructions': 'Tostar pan. Freír huevos. Servir con tomate en rodajas.',
             'tags': ['alto-en-proteína', 'saciante', 'completo']},
            
            {'name': 'Bowl de yogur y frutas', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 250,
             'ingredients': ['Yogur griego 150g', 'Frutos rojos 100g', 'Granola 30g', 'Miel'],
             'instructions': 'Servir yogur en bowl. Agregar frutos rojos, granola y miel.',
             'tags': ['antioxidante', 'proteico', 'refrescante']},
            
            {'name': 'Scrambled eggs con espinacas', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 10, 'servings': 2, 'calories_per_serving': 220,
             'ingredients': ['Huevo 4', 'Espinacas 100g', 'Cebolla', 'Aceite de oliva'],
             'instructions': 'Saltear espinacas con cebolla. Agregar huevos batidos. Revuelto hasta cuajar.',
             'tags': ['alto-en-proteína', 'rico-en-hierro', 'nutritivo']},
            
            {'name': 'Crepes de avena', 'category': 'Desayuno', 'difficulty': 'medium',
             'prep_time_minutes': 20, 'servings': 4, 'calories_per_serving': 240,
             'ingredients': ['Avena 100g', 'Huevo 2', 'Leche 200ml', 'Plátano', 'Miel'],
             'instructions': 'Batir avena con huevos y leche. Cocinar crepes. Servir con plátano y miel.',
             'tags': ['saludable', 'sin-harina', 'delicioso']},
        ]
        
        # ALMUERZOS ESPECÍFICOS
        lunches = [
            {'name': 'Pechuga de pollo a la plancha con arroz', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 30, 'servings': 2, 'calories_per_serving': 420,
             'ingredients': ['Pechuga de pollo 300g', 'Arroz integral 150g', 'Brócoli', 'Aceite de oliva'],
             'instructions': 'Cocinar arroz. Asar pollo a la plancha. Cocinar brócoli al vapor.',
             'tags': ['alto-en-proteína', 'completo', 'balanceado']},
            
            {'name': 'Salmón con patatas y verduras', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 35, 'servings': 2, 'calories_per_serving': 480,
             'ingredients': ['Salmón 300g', 'Patatas 300g', 'Calabacín', 'Pimiento', 'Aceite'],
             'instructions': 'Hornear patatas. Asar salmón y verduras. Servir todo junto.',
             'tags': ['rico-en-omega3', 'nutritivo', 'saciante']},
            
            {'name': 'Ensalada completa de pollo', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 25, 'servings': 2, 'calories_per_serving': 380,
             'ingredients': ['Pechuga de pollo 200g', 'Lechuga', 'Tomate', 'Aguacate', 'Nueces', 'Aceite'],
             'instructions': 'Asar pollo. Preparar ensalada con todas las verduras. Agregar pollo y aderezo.',
             'tags': ['ligero', 'rico-en-proteína', 'antioxidante']},
            
            {'name': 'Pasta integral con atún y verduras', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 25, 'servings': 4, 'calories_per_serving': 390,
             'ingredients': ['Pasta integral 250g', 'Atún en lata 200g', 'Tomate cherry', 'Espinacas', 'Aceite'],
             'instructions': 'Cocinar pasta. Mezclar con atún y verduras salteadas.',
             'tags': ['rico-en-proteína', 'omega3', 'completo']},
            
            {'name': 'Bowl de quinoa con garbanzos', 'category': 'Almuerzo', 'difficulty': 'medium',
             'prep_time_minutes': 40, 'servings': 4, 'calories_per_serving': 410,
             'ingredients': ['Quinoa 200g', 'Garbanzos 400g', 'Verduras asadas', 'Aceite', 'Especias'],
             'instructions': 'Cocinar quinoa. Asar garbanzos y verduras. Servir en bowl con aderezo.',
             'tags': ['vegetariano', 'alto-en-proteína', 'completo']},
        ]
        
        # CENAS ESPECÍFICAS
        dinners = [
            {'name': 'Pescado al horno con verduras', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 40, 'servings': 2, 'calories_per_serving': 350,
             'ingredients': ['Pescado blanco 300g', 'Calabacín', 'Tomate', 'Cebolla', 'Hierbas'],
             'instructions': 'Hornear pescado con verduras y hierbas. Servir caliente.',
             'tags': ['ligero', 'rico-en-proteína', 'nutritivo']},
            
            {'name': 'Pollo al curry con verduras', 'category': 'Cena', 'difficulty': 'medium',
             'prep_time_minutes': 45, 'servings': 4, 'calories_per_serving': 320,
             'ingredients': ['Pollo 400g', 'Cebolla', 'Pimiento', 'Calabacín', 'Salsa curry', 'Leche de coco'],
             'instructions': 'Cocinar pollo con curry. Agregar verduras y leche de coco. Guisar.',
             'tags': ['sabroso', 'proteico', 'antiinflamatorio']},
            
            {'name': 'Sopa de verduras con pollo', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 35, 'servings': 4, 'calories_per_serving': 280,
             'ingredients': ['Pollo 200g', 'Verduras mixtas', 'Caldo', 'Fideos', 'Hierbas'],
             'instructions': 'Cocinar sopa con pollo, verduras y caldo. Agregar fideos y hierbas.',
             'tags': ['ligero', 'reconfortante', 'nutritivo']},
            
            {'name': 'Tortilla española completa', 'category': 'Cena', 'difficulty': 'medium',
             'prep_time_minutes': 35, 'servings': 4, 'calories_per_serving': 310,
             'ingredients': ['Huevo 6', 'Patata 400g', 'Cebolla', 'Aceite de oliva'],
             'instructions': 'Freír patatas y cebolla. Mezclar con huevos. Cocinar tortilla por ambos lados.',
             'tags': ['tradicional', 'saciante', 'completo']},
            
            {'name': 'Ensalada de atún con huevo', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 15, 'servings': 2, 'calories_per_serving': 290,
             'ingredients': ['Atún en lata 200g', 'Huevo cocido 2', 'Lechuga', 'Tomate', 'Aceite'],
             'instructions': 'Preparar ensalada con lechuga y tomate. Agregar atún y huevo. Aderezar.',
             'tags': ['rápido', 'alto-en-proteína', 'ligero']},
        ]
        
        recipes = breakfasts + lunches + dinners
        
        created = 0
        skipped = 0
        
        for recipe in recipes:
            try:
                if Recipe.objects.filter(name=recipe['name']).exists():
                    skipped += 1
                    continue
                
                Recipe.objects.create(**recipe)
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Recetas creadas: {created}, omitidas: {skipped}'
        ))

