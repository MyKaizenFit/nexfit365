-- Reparación de tablas de exclusiones de nutrición con posible corrupción de relación/OID
-- Uso sugerido:
--   psql -h <host> -p <port> -U <user> -d <db> -f scripts/deployment/repair_nutrition_exclusions.sql
--
-- NOTA:
-- - Ejecutar en ventana de mantenimiento (bloquea temporalmente escrituras en estas tablas).
-- - Intenta respaldar datos; si la tabla está corrupta y no se puede leer, continúa recreando estructura limpia.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- 1) Backups "best effort" (si SELECT falla, el script continúa)
DO $$
BEGIN
    BEGIN
        EXECUTE 'DROP TABLE IF EXISTS public.nutrition_mealrecipeexclusion_backup_corrupt';
        EXECUTE 'CREATE TABLE public.nutrition_mealrecipeexclusion_backup_corrupt AS SELECT * FROM public.nutrition_mealrecipeexclusion';
        RAISE NOTICE 'Backup creado: nutrition_mealrecipeexclusion_backup_corrupt';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudo respaldar nutrition_mealrecipeexclusion: %', SQLERRM;
    END;

    BEGIN
        EXECUTE 'DROP TABLE IF EXISTS public.nutrition_mealingredientexclusion_backup_corrupt';
        EXECUTE 'CREATE TABLE public.nutrition_mealingredientexclusion_backup_corrupt AS SELECT * FROM public.nutrition_mealingredientexclusion';
        RAISE NOTICE 'Backup creado: nutrition_mealingredientexclusion_backup_corrupt';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudo respaldar nutrition_mealingredientexclusion: %', SQLERRM;
    END;
END $$;

-- 2) Re-crear tablas desde cero (estructura alineada con migraciones 0021/0022)
DROP TABLE IF EXISTS public.nutrition_mealrecipeexclusion CASCADE;
DROP TABLE IF EXISTS public.nutrition_mealingredientexclusion CASCADE;

CREATE TABLE public.nutrition_mealrecipeexclusion (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    reason text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    recipe_id uuid NOT NULL,
    user_id bigint NOT NULL,
    CONSTRAINT unique_user_recipe_exclusion UNIQUE (user_id, recipe_id),
    CONSTRAINT nutrition_mealrecipeexclusion_recipe_id_fk
        FOREIGN KEY (recipe_id) REFERENCES public.nutrition_recipe(id) ON DELETE CASCADE,
    CONSTRAINT nutrition_mealrecipeexclusion_user_id_fk
        FOREIGN KEY (user_id) REFERENCES public.accounts_customuser(id) ON DELETE CASCADE
);

CREATE INDEX nutrition_m_user_id_08fa6d_idx
    ON public.nutrition_mealrecipeexclusion (user_id, is_active);

CREATE INDEX nutrition_m_recipe__7d6a04_idx
    ON public.nutrition_mealrecipeexclusion (recipe_id, is_active);

CREATE TABLE public.nutrition_mealingredientexclusion (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    term varchar(120) NOT NULL,
    reason text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    user_id bigint NOT NULL,
    CONSTRAINT unique_user_ingredient_exclusion UNIQUE (user_id, term),
    CONSTRAINT nutrition_mealingredientexclusion_user_id_fk
        FOREIGN KEY (user_id) REFERENCES public.accounts_customuser(id) ON DELETE CASCADE
);

CREATE INDEX nutrition_me_user_id_c83f0c_idx
    ON public.nutrition_mealingredientexclusion (user_id, is_active);

CREATE INDEX nutrition_me_term_8cc6dd_idx
    ON public.nutrition_mealingredientexclusion (term, is_active);

COMMIT;

-- 3) Verificación rápida
SELECT to_regclass('public.nutrition_mealrecipeexclusion') AS recipe_exclusion_table;
SELECT to_regclass('public.nutrition_mealingredientexclusion') AS ingredient_exclusion_table;
