#!/usr/bin/env python3
"""
Fusiona registros que solo existen en pro-db-1 (172.19.0.5) hacia nexfit-pro-db-1 (172.19.0.3).
Ejecutar solo con mantenimiento activo y backups previos.
"""
from __future__ import annotations

import json
import sys
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import psycopg2
import psycopg2.extras

SOURCE = "172.19.0.5"
TARGET = "172.19.0.3"
DB = dict(port=5432, dbname="mykaizenfit", user="postgres", password="vUX4*5nVXCkEh3VI0zDrUSYn")

NUTRITION_PLAN_IDS = [
    "55b1fe9b-32d3-47ee-b9ef-80990a232e94",  # Anaís - Dieta Flexible
    "a4d97229-2348-46ae-8e68-89b972951ef5",  # Marc - Menú ganancia muscular
    "0cd73922-bead-4d6b-9129-990c915ad1fc",  # Plantilla AUTO-DEFECTO nutrición
]

WORKOUT_PROGRAM_IDS = [
    "3a5f242a-17dc-4251-a904-786896d21e04",
    "571487aa-74db-44cb-bbab-4f2a67a84495",
    "656339d4-6861-49ff-949f-55bee3131d0e",
    "76047014-4be0-4dc1-b5e1-1844e0b5ac57",
]


def connect(host: str):
    return psycopg2.connect(host=host, **DB)


def exists(dst, table: str, pk_col: str, pk_val) -> bool:
    with dst.cursor() as cur:
        cur.execute(f"SELECT 1 FROM {table} WHERE {pk_col} = %s LIMIT 1", (pk_val,))
        return cur.fetchone() is not None


def get_json_columns(conn, table: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
              AND data_type IN ('json', 'jsonb')
            """,
            (table,),
        )
        return {r[0] for r in cur.fetchall()}


def adapt_row(row: dict, json_cols: set[str]) -> dict:
    adapted = dict(row)
    for col in json_cols:
        if col in adapted and adapted[col] is not None:
            adapted[col] = psycopg2.extras.Json(adapted[col])
    return adapted


def copy_rows(src, dst, table: str, where_sql: str, params: tuple) -> int:
    json_cols = get_json_columns(dst, table)
    with src.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f"SELECT * FROM {table} WHERE {where_sql}", params)
        rows = cur.fetchall()
    if not rows:
        return 0

    cols = list(rows[0].keys())
    col_list = ", ".join(cols)
    placeholders = ", ".join(f"%({c})s" for c in cols)
    sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"

    copied = 0
    with dst.cursor() as cur:
        for row in rows:
            cur.execute(sql, adapt_row(row, json_cols))
            copied += cur.rowcount
    return copied


def copy_workout_program(src, dst, program_id: str) -> dict:
    if exists(dst, "workouts_workoutprogram", "id", program_id):
        return {"program_id": program_id, "status": "already_exists"}

    stats = {"program_id": program_id, "status": "copied", "tables": {}}
    stats["tables"]["workouts_workoutprogram"] = copy_rows(
        src, dst, "workouts_workoutprogram", "id = %s", (program_id,)
    )

    with src.cursor() as cur:
        cur.execute("SELECT id::text FROM workouts_workoutday WHERE program_id = %s", (program_id,))
        day_ids = [r[0] for r in cur.fetchall()]

    if day_ids:
        stats["tables"]["workouts_workoutday"] = copy_rows(
            src, dst, "workouts_workoutday", "program_id = %s", (program_id,)
        )
        stats["tables"]["workouts_workoutdayexercise"] = copy_rows(
            src,
            dst,
            "workouts_workoutdayexercise",
            "workout_day_id = ANY(%s::uuid[])",
            (day_ids,),
        )
    return stats


def copy_nutrition_plan(src, dst, plan_id: str) -> dict:
    if exists(dst, "nutrition_nutritionplan", "id", plan_id):
        return {"plan_id": plan_id, "status": "already_exists"}

    stats = {"plan_id": plan_id, "status": "copied", "tables": {}}
    stats["tables"]["nutrition_nutritionplan"] = copy_rows(
        src, dst, "nutrition_nutritionplan", "id = %s", (plan_id,)
    )

    with src.cursor() as cur:
        cur.execute("SELECT id::text FROM nutrition_planmeal WHERE plan_id = %s", (plan_id,))
        meal_ids = [r[0] for r in cur.fetchall()]

    if meal_ids:
        stats["tables"]["nutrition_planmeal"] = copy_rows(
            src, dst, "nutrition_planmeal", "plan_id = %s", (plan_id,)
        )
        stats["tables"]["nutrition_planmealrecipe"] = copy_rows(
            src,
            dst,
            "nutrition_planmealrecipe",
            "meal_id = ANY(%s::uuid[])",
            (meal_ids,),
        )
        stats["tables"]["nutrition_planmeal_suggested_recipes"] = copy_rows(
            src,
            dst,
            "nutrition_planmeal_suggested_recipes",
            "planmeal_id = ANY(%s::uuid[])",
            (meal_ids,),
        )

    stats["tables"]["nutrition_nutritionplanassignment"] = copy_rows(
        src, dst, "nutrition_nutritionplanassignment", "plan_id = %s", (plan_id,)
    )
    return stats


def activate_nutrition_for_users(dst):
    """Activa los planes nutricionales fusionados y desactiva el resto del mismo usuario."""
    with dst.cursor() as cur:
        for plan_id in NUTRITION_PLAN_IDS[:2]:
            cur.execute(
                "SELECT user_id FROM nutrition_nutritionplan WHERE id = %s AND user_id IS NOT NULL",
                (plan_id,),
            )
            row = cur.fetchone()
            if not row:
                continue
            user_id = row[0]
            cur.execute(
                "UPDATE nutrition_nutritionplan SET is_active = false WHERE user_id = %s AND id != %s",
                (user_id, plan_id),
            )
            cur.execute(
                "UPDATE nutrition_nutritionplan SET is_active = true WHERE id = %s",
                (plan_id,),
            )
            cur.execute(
                """
                UPDATE nutrition_nutritionplanassignment
                SET is_active = false, updated_at = NOW()
                WHERE user_id = %s AND plan_id != %s
                """,
                (user_id, plan_id),
            )
            cur.execute(
                """
                UPDATE nutrition_nutritionplanassignment
                SET is_active = true, updated_at = NOW()
                WHERE plan_id = %s AND user_id = %s
                """,
                (plan_id, user_id),
            )


def main():
    src = connect(SOURCE)
    dst = connect(TARGET)
    src.autocommit = False
    dst.autocommit = False

    report = {"nutrition": [], "workouts": []}
    try:
        for plan_id in NUTRITION_PLAN_IDS:
            report["nutrition"].append(copy_nutrition_plan(src, dst, plan_id))
        activate_nutrition_for_users(dst)

        for program_id in WORKOUT_PROGRAM_IDS:
            report["workouts"].append(copy_workout_program(src, dst, program_id))

        dst.commit()
        print(json.dumps(report, indent=2, default=str))
        return 0
    except Exception as exc:
        dst.rollback()
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
    finally:
        src.close()
        dst.close()


if __name__ == "__main__":
    raise SystemExit(main())
