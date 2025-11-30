#!/bin/bash

echo "🔄 Sincronizando archivos faltantes desde producción a desarrollo"
echo "=================================================================="
echo ""

BACKUP_DIR="./backup_antes_sincronizacion_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creando backup en: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
echo ""

echo "1️⃣ Sincronizando componentes de frontend que faltan..."

# Componentes de admin
ARCHIVOS_FRONTEND=(
    "app/admin/components/exercise-management.tsx"
    "app/admin/components/nutrition-management.tsx"
    "app/admin/components/workout-plan-management.tsx"
    "components/dashboard/progress-dashboard.tsx"
    "hooks/use-admin-nutrition.ts"
)

for archivo in "${ARCHIVOS_FRONTEND[@]}"; do
    archivo_prod="../app/frontend/$archivo"
    archivo_dev="./frontend/$archivo"
    
    if [ -f "$archivo_prod" ]; then
        # Crear backup si existe en dev
        if [ -f "$archivo_dev" ]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$archivo")"
            cp "$archivo_dev" "$BACKUP_DIR/$archivo" 2>/dev/null || true
        fi
        
        # Crear directorio si no existe
        mkdir -p "$(dirname "$archivo_dev")"
        
        # Copiar desde producción
        cp "$archivo_prod" "$archivo_dev"
        echo "   ✅ Copiado: $archivo"
    else
        echo "   ⚠️  No existe en producción: $archivo_prod"
    fi
done

echo ""
echo "2️⃣ Sincronizando archivos del backend que faltan..."

ARCHIVOS_BACKEND=(
    "workouts/admin_views.py"
    "workouts/views.py"
)

for archivo in "${ARCHIVOS_BACKEND[@]}"; do
    archivo_prod="../app/backend/$archivo"
    archivo_dev="./backend/$archivo"
    
    if [ -f "$archivo_prod" ]; then
        # Crear backup si existe en dev
        if [ -f "$archivo_dev" ]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$archivo")"
            cp "$archivo_dev" "$BACKUP_DIR/$archivo" 2>/dev/null || true
        fi
        
        # Crear directorio si no existe
        mkdir -p "$(dirname "$archivo_dev")"
        
        # Copiar desde producción
        cp "$archivo_prod" "$archivo_dev"
        echo "   ✅ Copiado: $archivo"
    else
        echo "   ⚠️  No existe en producción: $archivo_prod"
    fi
done

echo ""
echo "3️⃣ Restaurando imports en admin/page.tsx..."

if grep -q "// TODO: Restaurar estos componentes" "./frontend/app/admin/page.tsx"; then
    echo "   Restaurando imports originales..."
    
    # Buscar las líneas con placeholders
    sed -i 's|// TODO: Restaurar estos componentes cuando estén disponibles|// Lazy loading de componentes pesados para code splitting|g' "./frontend/app/admin/page.tsx"
    sed -i 's|// const ExerciseManagement = lazy|const ExerciseManagement = lazy|g' "./frontend/app/admin/page.tsx"
    sed -i 's|// const WorkoutPlanManagement = lazy|const WorkoutPlanManagement = lazy|g' "./frontend/app/admin/page.tsx"
    sed -i 's|// const NutritionManagement = lazy|const NutritionManagement = lazy|g' "./frontend/app/admin/page.tsx"
    
    # Eliminar los componentes placeholder
    sed -i '/^const ExerciseManagement = () => (/,/^)$/d' "./frontend/app/admin/page.tsx"
    sed -i '/^const WorkoutPlanManagement = () => (/,/^)$/d' "./frontend/app/admin/page.tsx"
    sed -i '/^const NutritionManagement = () => (/,/^)$/d' "./frontend/app/admin/page.tsx"
    
    echo "   ✅ Imports restaurados"
else
    echo "   ℹ️  No hay placeholders que restaurar"
fi

echo ""
echo "4️⃣ Restaurando hook en nutrition-plan-management.tsx..."

if grep -q "// TODO: Restaurar cuando esté disponible" "./frontend/app/admin/components/nutrition-plan-management.tsx"; then
    echo "   Restaurando import de useAdminNutrition..."
    
    sed -i 's|// TODO: Restaurar cuando esté disponible|import { useAdminNutritionPlans, NutritionPlan, CreateNutritionPlanData } from "@\/hooks\/use-admin-nutrition-plans"|g' "./frontend/app/admin/components/nutrition-plan-management.tsx"
    sed -i 's|// import { useAdminNutrition }|import { useAdminNutrition }|g' "./frontend/app/admin/components/nutrition-plan-management.tsx"
    
    # Eliminar función placeholder
    sed -i '/^\/\/ Hook temporal placeholder/,/^}$/d' "./frontend/app/admin/components/nutrition-plan-management.tsx"
    sed -i '/^function useAdminNutrition()/,/^}$/d' "./frontend/app/admin/components/nutrition-plan-management.tsx"
    
    echo "   ✅ Hook restaurado"
else
    echo "   ℹ️  No hay hook placeholder que restaurar"
fi

echo ""
echo "5️⃣ Restaurando ProgressDashboard en progress/page.tsx..."

if grep -q "ProgressDashboardPlaceholder" "./frontend/app/dashboard/progress/page.tsx"; then
    echo "   Restaurando import de ProgressDashboard..."
    cp "../app/frontend/app/dashboard/progress/page.tsx" "./frontend/app/dashboard/progress/page.tsx" 2>/dev/null || echo "   ⚠️  Archivo no existe en producción"
    echo "   ✅ Componente restaurado"
else
    echo "   ℹ️  Ya está usando ProgressDashboard"
fi

echo ""
echo "✅ Sincronización completada"
echo ""
echo "📦 Backup guardado en: $BACKUP_DIR"
echo ""
echo "🔄 Próximos pasos:"
echo "   1. Reconstruir imágenes Docker: sudo ./reconstruir_backend.sh"
echo "   2. O usar: sudo ./levantar_dev_clean.sh --build"
echo ""
