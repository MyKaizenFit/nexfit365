from django.core.management.base import BaseCommand
from nutrition.models import Recipe
import random

class Command(BaseCommand):
    help = 'Crea una gran variedad de recetas nutricionales'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Eliminar todas las recetas existentes antes de crear nuevas')

    def handle(self, *args, **options):
        if options['clear']:
            Recipe.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Recetas existentes eliminadas'))
        
        recipes_data = self.get_all_recipes()
        
        created_count = 0
        skipped_count = 0
        
        self.stdout.write(f'📚 Generando {len(recipes_data)} recetas...')
        
        for recipe in recipes_data:
            try:
                # Verificar si ya existe
                if Recipe.objects.filter(name=recipe['name']).exists():
                    skipped_count += 1
                    continue
                
                Recipe.objects.create(**recipe)
                created_count += 1
                
                if created_count % 50 == 0:
                    self.stdout.write(f'✅ Creadas {created_count} recetas...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error creando receta "{recipe.get("name", "desconocida")}": {e}'))
                continue
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Proceso completado:\n'
            f'   • Recetas creadas: {created_count}\n'
            f'   • Recetas omitidas (ya existían): {skipped_count}\n'
            f'   • Total en base de datos: {Recipe.objects.count()}'
        ))
    
    def get_all_recipes(self):
        """Retorna una lista completa de recetas"""
        recipes = []
        
        # DESAYUNOS
        breakfast_recipes = [
            {'name': 'Avena con plátano y frutos secos', 'category': 'Desayuno', 'difficulty': 'easy', 
             'prep_time_minutes': 10, 'servings': 1, 'calories_per_serving': 350,
             'ingredients': ['Avena 50g', 'Plátano 1', 'Frutos secos 20g', 'Leche 200ml', 'Canela'],
             'instructions': 'Cocinar avena con leche. Agregar plátano en rodajas y frutos secos. Espolvorear canela.',
             'tags': ['saludable', 'rico-en-fibra', 'proteico', 'rápido']},
            
            {'name': 'Tostadas de aguacate con huevo', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 10, 'servings': 2, 'calories_per_serving': 280,
             'ingredients': ['Pan integral 2 rebanadas', 'Aguacate 1/2', 'Huevo 2', 'Tomate', 'Aceite de oliva'],
             'instructions': 'Tostar pan. Machacar aguacate. Freír huevos. Servir aguacate sobre pan con huevo y tomate.',
             'tags': ['saludable', 'grasas-saludables', 'proteico']},
            
            {'name': 'Smoothie bowl de frutas', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 15, 'servings': 1, 'calories_per_serving': 320,
             'ingredients': ['Plátano 1', 'Frutos rojos 100g', 'Yogur griego 100g', 'Granola 30g', 'Miel'],
             'instructions': 'Licuar plátano y frutos. Verter en bowl. Agregar yogur, granola y miel.',
             'tags': ['bajo-en-calorías', 'antioxidante', 'refrescante']},
            
            {'name': 'Omelette de clara con verduras', 'category': 'Desayuno', 'difficulty': 'easy',
             'prep_time_minutes': 15, 'servings': 2, 'calories_per_serving': 180,
             'ingredients': ['Clara de huevo 6', 'Espinacas', 'Champiñones', 'Tomate', 'Queso bajo en grasa'],
             'instructions': 'Saltear verduras. Batir claras. Cocinar omelette agregando verduras y queso.',
             'tags': ['alto-en-proteína', 'bajo-en-grasa', 'rico-en-hierro']},
            
            {'name': 'Panquecas de avena y proteína', 'category': 'Desayuno', 'difficulty': 'medium',
             'prep_time_minutes': 20, 'servings': 4, 'calories_per_serving': 250,
             'ingredients': ['Avena 100g', 'Proteína en polvo 2 scoops', 'Huevo 1', 'Leche 200ml', 'Miel'],
             'instructions': 'Mezclar ingredientes. Cocinar panquecas. Servir con miel.',
             'tags': ['alto-en-proteína', 'saludable', 'post-entreno']},
        ]
        
        # ALMUERZOS
        lunch_recipes = [
            {'name': 'Ensalada de quinoa con pollo', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 30, 'servings': 2, 'calories_per_serving': 420,
             'ingredients': ['Quinoa 100g', 'Pechuga de pollo 200g', 'Verduras mixtas', 'Aceite de oliva', 'Limón'],
             'instructions': 'Cocinar quinoa. Asar pollo. Mezclar todo con verduras y aderezo.',
             'tags': ['alto-en-proteína', 'completo', 'saludable']},
            
            {'name': 'Salmón a la plancha con verduras', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 25, 'servings': 2, 'calories_per_serving': 380,
             'ingredients': ['Salmón 300g', 'Brócoli', 'Coliflor', 'Zanahoria', 'Aceite de oliva'],
             'instructions': 'Asar salmón. Cocinar verduras al vapor. Servir con aceite de oliva.',
             'tags': ['rico-en-omega3', 'bajo-en-carbohidratos', 'proteico']},
            
            {'name': 'Pollo al curry con arroz integral', 'category': 'Almuerzo', 'difficulty': 'medium',
             'prep_time_minutes': 40, 'servings': 4, 'calories_per_serving': 450,
             'ingredients': ['Pollo 400g', 'Arroz integral 200g', 'Leche de coco', 'Curry', 'Cebolla', 'Ajo'],
             'instructions': 'Sofreír cebolla y ajo. Agregar pollo y curry. Cocinar con leche de coco. Servir con arroz.',
             'tags': ['sabroso', 'completo', 'antiinflamatorio']},
            
            {'name': 'Tacos de carne con verduras', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 20, 'servings': 4, 'calories_per_serving': 350,
             'ingredients': ['Carne molida 400g', 'Tortillas integrales 8', 'Lechuga', 'Tomate', 'Aguacate'],
             'instructions': 'Cocinar carne. Calentar tortillas. Rellenar con carne y verduras.',
             'tags': ['rico-en-proteína', 'saludable', 'sabroso']},
            
            {'name': 'Pasta integral con atún y verduras', 'category': 'Almuerzo', 'difficulty': 'easy',
             'prep_time_minutes': 25, 'servings': 4, 'calories_per_serving': 400,
             'ingredients': ['Pasta integral 250g', 'Atún en lata 200g', 'Tomate cherry', 'Espinacas', 'Aceite'],
             'instructions': 'Cocinar pasta. Agregar atún y verduras. Mezclar con aceite.',
             'tags': ['rico-en-proteína', 'omega3', 'carbohidratos']},
        ]
        
        # CENAS
        dinner_recipes = [
            {'name': 'Filete de ternera con patatas asadas', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 45, 'servings': 2, 'calories_per_serving': 520,
             'ingredients': ['Filete de ternera 300g', 'Patatas 300g', 'Romero', 'Aceite de oliva'],
             'instructions': 'Hornear patatas con romero. Asar filete. Servir.',
             'tags': ['alto-en-proteína', 'rico-en-hierro', 'energético']},
            
            {'name': 'Pescado con ensalada de rúcula', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 20, 'servings': 2, 'calories_per_serving': 290,
             'ingredients': ['Pescado blanco 300g', 'Rúcula 100g', 'Tomate cherry', 'Aceite', 'Limón'],
             'instructions': 'Asar pescado. Preparar ensalada con rúcula y tomate. Servir con limón.',
             'tags': ['bajo-en-calorías', 'rico-en-proteína', 'ligero']},
            
            {'name': 'Tortilla española con ensalada', 'category': 'Cena', 'difficulty': 'medium',
             'prep_time_minutes': 30, 'servings': 4, 'calories_per_serving': 310,
             'ingredients': ['Huevo 6', 'Patata 400g', 'Cebolla', 'Ensalada mixta'],
             'instructions': 'Preparar tortilla con patata y cebolla. Servir con ensalada.',
             'tags': ['tradicional', 'completo', 'saciante']},
            
            {'name': 'Sopa de verduras con pollo', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 35, 'servings': 4, 'calories_per_serving': 250,
             'ingredients': ['Pollo 200g', 'Verduras mixtas', 'Caldo de pollo', 'Fideos', 'Hierbas'],
             'instructions': 'Cocinar pollo. Agregar verduras. Añadir caldo y fideos. Condimentar.',
             'tags': ['ligero', 'reconfortante', 'hidratante']},
            
            {'name': 'Hamburguesa casera de pavo', 'category': 'Cena', 'difficulty': 'easy',
             'prep_time_minutes': 25, 'servings': 4, 'calories_per_serving': 380,
             'ingredients': ['Pav包 molido 400g', 'Pan integral 4', 'Ensalada', 'Tomate', 'Queso bajo en grasa'],
             'instructions': 'Formar hamburguesas. Cocinar. Servir en pan con verduras y queso.',
             'tags': ['alto-en-proteína', 'bajo-en-grasa', 'saludable']},
        ]
        
        # SNACKS
        snack_recipes = [
            {'name': 'Proteína shake', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 220,
             'ingredients': ['Proteína en polvo 1 scoop', 'Leche 200ml', 'Plátano 1', 'Miel'],
             'instructions': 'Licuar todos los ingredientes. Servir frío.',
             'tags': ['alto-en-proteína', 'rápido', 'post-entreno']},
            
            {'name': 'Fruta con yogur y nueces', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 200,
             'ingredients': ['Yogur griego 150g', 'Fruta mixta', 'Nueces 20g', 'Miel'],
             'instructions': 'Servir yogur con fruta. Agregar nueces y miel.',
             'tags': ['saludable', 'rico-en-proteína', 'antioxidante']},
            
            {'name': 'Hummus con verduras', 'category': 'Snack', 'difficulty': 'medium',
             'prep_time_minutes': 15, 'servings': 4, 'calories_per_serving': 150,
             'ingredients': ['Garbanzos 200g', 'Tahini', 'Limón', 'Ajo', 'Verduras para dippear'],
             'instructions': 'Procesar garbanzos con tahini, limón y ajo. Servir con verduras.',
             'tags': ['rico-en-proteína', 'vegetariano', 'saludable']},
            
            {'name': 'Batido verde energético', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 180,
             'ingredients': ['Espinacas', 'Plátano', 'Pera', 'Leche de almendras', 'Jengibre'],
             'instructions': 'Licuar todos los ingredientes. Servir.',
             'tags': ['alto-en-vitaminas', 'energético', 'antiinflamatorio']},
        ]
        
        # Agregar todas las recetas
        recipes.extend(breakfast_recipes)
        recipes.extend(lunch_recipes)
        recipes.extend(dinner_recipes)
        recipes.extend(snack_recipes)
        
        # Agregar 50 recetas adicionales aleatorias de cada categoría
        additional_recipes = self.generate_additional_recipes()
        recipes.extend(additional_recipes)
        
        return recipes
    
    def generate_additional_recipes(self):
        """Genera recetas adicionales con combinaciones aleatorias"""
        categories = ['Desayuno', 'Almuerzo', 'Cena', 'Snack']
        difficulties = ['easy', 'medium', 'hard']
        
        proteins = ['Pollo', 'Pavo', 'Salmón', 'Atún', 'Ternera', 'Huevo', 'Quinoa', 'Lentejas', 'Tofu']
        carbs = ['Arroz integral', 'Avena', 'Quinoa', 'Pasta integral', 'Patata', 'Batata', 'Pan integral']
        vegetables = ['Brócoli', 'Espinacas', 'Berenjena', 'Calabacín', 'Pimiento', 'Tomate', 'Cebolla', 'Zanahoria']
        fats = ['Aceite de oliva', 'Aguacate', 'Frutos secos', 'Semillas']
        
        recipes = []
        
        for i in range(50):
            category = random.choice(categories)
            difficulty = random.choice(difficulties)
            
            # Crear receta única
            recipe = {
                'name': f'{random.choice(["Delicioso", "Saludable", "Casa", "Energético", "Nutritivo"])} '
                        f'{random.choice(proteins)} con {random.choice(vegetables)}',
                'category': category,
                'difficulty': difficulty,
                'prep_time_minutes': random.randint(15, 60),
                'servings': random.randint(1, 4),
                'calories_per_serving': random.randint(180, 550),
                'ingredients': [
                    f'{random.choice(proteins)} {random.randint(100, 400)}g',
                    f'{random.choice(carbs)} {random.randint(50, 200)}g',
                    f'{random.choice(vegetables)}',
                    f'{random.choice(fats)}'
                ],
                'instructions': f'Preparar siguiendo la receta base de {category.lower()}. Combinar ingredientes y cocinar.',
                'tags': [category.lower(), difficulty, 'saludable', 'nutritivo']
            }
            
            recipes.append(recipe)
        
        return recipes



