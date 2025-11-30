from django.core.management.base import BaseCommand
from nutrition.models import Recipe

class Command(BaseCommand):
    help = 'Agrega más recetas de snacks específicas y adecuadas'

    def handle(self, *args, **options):
        snacks = [
            {'name': 'Yogur griego con frutos rojos', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 150,
             'ingredients': ['Yogur griego 150g', 'Frutos rojos 100g', 'Miel 1 cucharada'],
             'instructions': 'Servir yogur con frutos rojos frescos y endulzar con miel.',
             'tags': ['rico-en-proteína', 'antioxidante', 'rápido']},
            
            {'name': 'Manzana con mantequilla de almendras', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 2, 'servings': 1, 'calories_per_serving': 200,
             'ingredients': ['Manzana 1', 'Mantequilla de almendras 1 cucharada'],
             'instructions': 'Cortar manzana en rodajas. Servir con mantequilla de almendras.',
             'tags': ['saludable', 'grasas-saludables', 'portátil']},
            
            {'name': 'Batido de proteína post-entreno', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 220,
             'ingredients': ['Proteína en polvo 1 scoop', 'Leche 200ml', 'Plátano 1/2', 'Miel'],
             'instructions': 'Licuar todos los ingredientes. Servir inmediatamente.',
             'tags': ['post-entreno', 'alto-en-proteína', 'recuperador']},
            
            {'name': 'Pudín de chía con frutas', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 10, 'servings': 1, 'calories_per_serving': 180,
             'ingredients': ['Chía 30g', 'Leche de almendras 200ml', 'Frutos rojos', 'Miel'],
             'instructions': 'Mezclar chía con leche. Dejar reposar 10 minutos. Agregar frutos y miel.',
             'tags': ['rico-en-fibra', 'saludable', 'sin-lactosa']},
            
            {'name': 'Mix de frutos secos', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 2, 'servings': 1, 'calories_per_serving': 200,
             'ingredients': ['Almendras 20g', 'Nueces 15g', 'Pasas 15g', 'Arándanos secos 10g'],
             'instructions': 'Mezclar todos los frutos secos. Servir en porción.',
             'tags': ['energético', 'grasas-saludables', 'portátil']},
            
            {'name': 'Rollitos de pavo con queso', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 150,
             'ingredients': ['Pavo en lonchas 50g', 'Queso bajo en grasa 30g', 'Lechuga'],
             'instructions': 'Envolver queso en lonchas de pavo. Agregar lechuga.',
             'tags': ['alto-en-proteína', 'bajo-en-carbohidratos', 'saludable']},
            
            {'name': 'Palitos de apio con hummus', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 120,
             'ingredients': ['Apio 2 ramas', 'Hummus 50g'],
             'instructions': 'Cortar apio en palitos. Servir con hummus.',
             'tags': ['bajo-en-calorías', 'rico-en-fibra', 'vegetariano']},
            
            {'name': 'Tostada de aguacate', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 180,
             'ingredients': ['Pan integral 1 rebanada', 'Aguacate 1/4', 'Semillas de sésamo'],
             'instructions': 'Tostar pan. Machacar aguacate. Servir con semillas.',
             'tags': ['grasas-saludables', 'fibra', 'saciante']},
            
            {'name': 'Cottage cheese con fruta', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 3, 'servings': 1, 'calories_per_serving': 140,
             'ingredients': ['Cottage cheese 100g', 'Fruta troceada 100g', 'Canela'],
             'instructions': 'Servir cottage cheese con fruta fresca. Espolvorear canela.',
             'tags': ['alto-en-proteína', 'bajo-en-grasa', 'saludable']},
            
            {'name': 'Smoothie verde energético', 'category': 'Snack', 'difficulty': 'easy',
             'prep_time_minutes': 5, 'servings': 1, 'calories_per_serving': 160,
             'ingredients': ['Espinacas 50g', 'Plátano 1/2', 'Kiwi 1', 'Leche de almendras 150ml'],
             'instructions': 'Licuar todos los ingredientes. Servir frío.',
             'tags': ['alto-en-vitaminas', 'energético', 'antioxidante']},
        ]
        
        created = 0
        skipped = 0
        
        for snack in snacks:
            try:
                if Recipe.objects.filter(name=snack['name']).exists():
                    skipped += 1
                    continue
                
                Recipe.objects.create(**snack)
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Snacks creados: {created}, omitidos: {skipped}'
        ))

