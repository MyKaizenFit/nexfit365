# Instrucciones para Regenerar Ejercicios y Planes de Entrenamiento

## Pasos a seguir:

### 1. Aplicar la migración (ya está aplicada ✅)

### 2. Eliminar todos los ejercicios y planes existentes
```bash
python manage.py delete_all_workouts --confirm
```

### 3. Crear ejercicios desde el listado
```bash
python manage.py populate_exercises_from_list --file exercises_list.json
```

### 4. Generar planes de entrenamiento
```bash
python manage.py generate_workout_plans_from_exercises
```

## Notas:

- El archivo `exercises_list.json` contiene 40 ejercicios ya configurados
- Puedes editar el archivo para añadir más ejercicios si lo necesitas
- Los planes por defecto se marcarán automáticamente para:
  - 3 días/semana, principiante, fitness general, rol básico
  - 4 días/semana, intermedio, ganancia muscular, rol pro
  - 5 días/semana, intermedio, fuerza, rol premium

