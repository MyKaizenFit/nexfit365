from __future__ import annotations

from copy import deepcopy
from typing import Any

CATEGORIES: list[dict[str, str]] = [
    {"key": "horario", "emoji": "🕒", "name": "Regulación del horario"},
    {"key": "estimulacion", "emoji": "📵", "name": "Reducir la estimulación"},
    {"key": "estimulantes", "emoji": "☕", "name": "Adaptar los estimulantes"},
    {"key": "alimentacion", "emoji": "🍽️", "name": "Alimentación nocturna"},
    {"key": "actividad", "emoji": "🏃", "name": "Actividad física"},
    {"key": "entorno", "emoji": "🛏️", "name": "Optimizar el entorno"},
    {"key": "estres", "emoji": "🧠", "name": "Gestión del estrés"},
    {"key": "salud", "emoji": "❤️", "name": "Cuidar la salud"},
    {"key": "higiene", "emoji": "🌙", "name": "Higiene del sueño"},
]

QUESTIONS_BY_CAT: dict[str, list[dict[str, Any]]] = {
    "horario": [
        {"pts": 3, "text": "¿Te acuestas a una hora diferente la mayoría de los días?"},
        {"pts": 3, "text": "¿Te levantas a una hora diferente la mayoría de los días?"},
        {"pts": 2, "text": "¿Duermes más de una hora extra los fines de semana para recuperar sueño?"},
        {"pts": 4, "text": "¿Trabajas por turnos o en horario nocturno?"},
        {"pts": 1, "text": "¿Llevas a los hijos al colegio y esto condiciona tu hora de despertarte?"},
    ],
    "estimulacion": [
        {"pts": 3, "text": "¿Utilizas el móvil durante la última hora antes de dormir?"},
        {"pts": 2, "text": "¿Ves la televisión durante la última hora antes de dormir?"},
        {"pts": 3, "text": "¿Respondes mensajes, correos o tareas de trabajo antes de acostarte?"},
    ],
    "estimulantes": [
        {"pts": 4, "text": "¿Tomas café después de las 15:00?"},
        {"pts": 4, "text": "¿Consumes bebidas energéticas durante la tarde o la noche?"},
        {"pts": 4, "text": "¿Utilizas preentrenos u otros suplementos con cafeína por la tarde?"},
        {"pts": 2, "text": "¿Fumas o consumes nicotina durante las últimas horas del día?"},
    ],
    "alimentacion": [
        {"pts": 3, "text": "¿Cenas menos de dos horas antes de acostarte?"},
        {"pts": 2, "text": "¿Sueles terminar la cena con sensación de estar muy llena?"},
        {"pts": 1, "text": "¿Bebes bastante agua u otras bebidas en la última media hora antes de dormir?"},
        {"pts": 3, "text": "¿Consumes alcohol por la noche varias veces por semana?"},
        {"pts": 1, "text": "¿Cocinar para otras personas retrasa habitualmente tu hora de cenar?"},
    ],
    "actividad": [
        {"pts": 2, "text": "¿Entrenas durante las dos horas previas a irte a dormir?"},
        {"pts": 3, "text": "¿Hay días en los que no realizas prácticamente ninguna actividad física?"},
    ],
    "entorno": [
        {"pts": 2, "text": "¿Duermes con alguna luz encendida o con mucha luz entrando desde el exterior?"},
        {"pts": 2, "text": "¿Tu habitación suele tener ruido por la noche?"},
        {"pts": 3, "text": "¿Tu dormitorio suele estar demasiado caliente para dormir cómodamente?"},
        {"pts": 2, "text": "¿Duermes con una persona que ronca o interrumpe tu sueño?"},
    ],
    "estres": [
        {"pts": 4, "text": "¿Te cuesta dejar de pensar cuando te acuestas?"},
        {"pts": 4, "text": "¿Consideras que tu nivel de estrés diario es alto?"},
        {"pts": 3, "text": "¿Te acuestas pensando en trabajo o problemas personales la mayoría de los días?"},
    ],
    "salud": [
        {"pts": 2, "text": "¿Te despiertas con dolor de cuello o espalda con frecuencia?"},
        {"pts": 5, "text": "¿Roncas con frecuencia o alguien te ha dicho que dejas de respirar mientras duermes?"},
        {"pts": 2, "text": "¿Te despiertas varias veces por la noche para ir al baño?"},
    ],
    "higiene": [
        {"pts": 2, "text": "¿Duermes siestas de más de 30 minutos?"},
        {"pts": 2, "text": "¿Utilizas la cama para trabajar, estudiar o ver series habitualmente?"},
        {"pts": 3, "text": "¿Permaneces despierta en la cama más de 30 minutos antes de dormir?"},
    ],
}

MICRO: dict[str, list[dict[str, Any]]] = {
    "horario": [
        {"s": 3, "t": "Acostarte y levantarte a la misma hora todos los días, incluido el fin de semana"},
        {"s": 3, "t": "Tomar 10-20 minutos de luz solar justo al despertar"},
        {"s": 2, "t": "Poner una alarma que marque el inicio de tu rutina para ir a dormir"},
        {"s": 2, "t": "Si necesitas cambiar el horario, ajustarlo solo 15-30 minutos cada pocos días"},
        {"s": 1, "t": "Evitar que tu horario del fin de semana se separe más de 1 hora del resto de la semana"},
    ],
    "estimulacion": [
        {"s": 3, "t": "Dejar el móvil fuera del alcance al menos 60 minutos antes de dormir"},
        {"s": 3, "t": "Evitar trabajo, correos y redes sociales durante la última hora del día"},
        {"s": 2, "t": "Sustituir la pantalla por un libro antes de dormir"},
        {"s": 1, "t": "Activar los filtros de luz cálida en los dispositivos durante la noche"},
    ],
    "estimulantes": [
        {"s": 3, "t": "No tomar cafeína durante las 8-10 horas previas a la hora de dormir"},
        {"s": 2, "t": "Cambiar el café de la tarde por descafeinado o una infusión"},
        {"s": 1, "t": "Revisar si algún suplemento o medicamento que tomas por la tarde contiene estimulantes"},
    ],
    "alimentacion": [
        {"s": 3, "t": "Cenar entre 2 y 3 horas antes de acostarte"},
        {"s": 3, "t": "Evitar que la cena sea muy abundante"},
        {"s": 2, "t": "Evitar el alcohol por la noche"},
        {"s": 1, "t": "Elegir en la cena alimentos que sean fáciles de digerir"},
    ],
    "actividad": [
        {"s": 3, "t": "Mantener actividad física regular a lo largo de la semana"},
        {"s": 2, "t": "Evitar entrenamientos muy intensos justo antes de dormir"},
        {"s": 1, "t": "Dar un paseo o hacer estiramientos suaves después de cenar"},
    ],
    "entorno": [
        {"s": 3, "t": "Mantener el dormitorio oscuro, silencioso y fresco"},
        {"s": 2, "t": "Usar antifaz o tapones si los necesitas"},
        {"s": 1, "t": "Usar aromas relajantes si te resultan agradables"},
    ],
    "estres": [
        {"s": 3, "t": "Practicar una meditación guiada de unos 10 minutos antes de dormir"},
        {"s": 3, "t": "Hacer respiración lenta durante 5-10 minutos al acostarte"},
        {"s": 2, "t": "Escribir tus preocupaciones o las tareas del día siguiente antes de meterte en la cama"},
        {"s": 1, "t": "Practicar relajación muscular progresiva"},
    ],
    "salud": [
        {"s": 3, "t": "Consultar con un profesional si hay ronquidos importantes, dolor persistente o sospecha de apnea"},
        {"s": 2, "t": "Revisar tu almohada y tu postura al dormir"},
        {"s": 1, "t": "Usar suplementación solo si está indicada por un profesional"},
    ],
    "higiene": [
        {"s": 3, "t": "Usar la cama únicamente para dormir"},
        {"s": 3, "t": "Limitar las siestas a 20-30 minutos"},
        {"s": 2, "t": "Si no te duermes en 20-30 minutos, levántate de la cama y vuelve cuando tengas sueño"},
        {"s": 1, "t": "Mantener una rutina relajante en los minutos previos a acostarte"},
    ],
}

DIAGNOSIS: dict[str, str] = {
    "horario": (
        "tu horario de sueño cambia bastante de un día a otro, y eso le cuesta mucho a tu reloj interno: "
        "cuando te acuestas y te levantas a horas distintas, tu cuerpo nunca llega a estabilizarse del todo."
    ),
    "estimulacion": (
        "en las horas antes de dormir tu cerebro sigue recibiendo estímulos —pantallas, mensajes, tareas— "
        "justo cuando necesita la señal contraria para prepararse para el descanso."
    ),
    "estimulantes": (
        "todavía hay estimulantes circulando en tu cuerpo a la hora de dormir, y eso dificulta que puedas "
        "relajarte del todo aunque estés cansada."
    ),
    "alimentacion": (
        "la forma en que cenas está interfiriendo con tu descanso: cenas tarde, abundante o muy cerca de la "
        "hora de dormir, y tu sistema digestivo sigue trabajando cuando debería estar descansando."
    ),
    "actividad": "tu actividad física durante el día no está ayudando a tu descanso nocturno todo lo que podría.",
    "entorno": (
        "el ambiente donde duermes —luz, ruido o temperatura— no está siendo tan favorable como podría "
        "para un sueño profundo."
    ),
    "estres": (
        "te cuesta desconectar la cabeza antes de dormir, y ese runrún mental es probablemente uno de los "
        "factores que más está afectando tu descanso."
    ),
    "salud": (
        "hay señales físicas —como el dolor, los ronquidos o los despertares nocturnos— que conviene revisar, "
        "porque pueden estar afectando tu sueño más de lo que parece."
    ),
    "higiene": (
        'algunos hábitos alrededor de la cama y las siestas están debilitando la asociación entre "cama" y '
        '"dormir", lo que hace más difícil conciliar el sueño.'
    ),
}

TIER_COLORS = {
    "ok": "#10B981",
    "watch": "#F59E0B",
    "work": "#FB923C",
    "high": "#F87171",
    "max": "#DC2626",
}


def tier_of(score: int) -> dict[str, str]:
    if score >= 13:
        return {"label": "Prioridad máxima", "color": TIER_COLORS["max"], "key": "max"}
    if score >= 9:
        return {"label": "Alta prioridad", "color": TIER_COLORS["high"], "key": "high"}
    if score >= 6:
        return {"label": "Conviene trabajar este pilar", "color": TIER_COLORS["work"], "key": "work"}
    if score >= 3:
        return {"label": "Hay margen de mejora", "color": TIER_COLORS["watch"], "key": "watch"}
    return {"label": "No es un área prioritaria", "color": TIER_COLORS["ok"], "key": "ok"}


def build_shuffled_questions() -> list[dict[str, Any]]:
    cat_keys = [category["key"] for category in CATEGORIES]
    max_len = max(len(QUESTIONS_BY_CAT[key]) for key in cat_keys)
    shuffled: list[dict[str, Any]] = []

    for round_index in range(max_len):
        for key in cat_keys:
            questions = QUESTIONS_BY_CAT[key]
            if round_index < len(questions):
                question = questions[round_index]
                shuffled.append({
                    "index": len(shuffled),
                    "category_key": key,
                    "pts": question["pts"],
                    "text": question["text"],
                })

    return shuffled


SHUFFLED_QUESTIONS = build_shuffled_questions()
TOTAL_QUESTIONS = len(SHUFFLED_QUESTIONS)


def compute_scores(answers: list[bool | None]) -> dict[str, int]:
    if len(answers) != TOTAL_QUESTIONS:
        raise ValueError(f"Se esperaban {TOTAL_QUESTIONS} respuestas, se recibieron {len(answers)}")

    scores = {category["key"]: 0 for category in CATEGORIES}
    for index, question in enumerate(SHUFFLED_QUESTIONS):
        if answers[index] is True:
            scores[question["category_key"]] += question["pts"]
    return scores


def build_script(name: str, scores: dict[str, int]) -> dict[str, Any]:
    ranked = sorted(
        [{**category, "score": scores.get(category["key"], 0)} for category in CATEGORIES],
        key=lambda item: item["score"],
        reverse=True,
    )
    top3 = ranked[:3]
    picks = [{"cat": cat, "micro": MICRO[cat["key"]][0]} for cat in top3]
    display_name = name.strip() if name and name.strip() else "la persona"

    lines: list[str] = []
    lines.append(f"GUION PARA VIDEO PERSONALIZADO — {display_name}")
    lines.append("================================================\n")
    lines.append("[Introducción — mirando a cámara, tono cercano]")
    lines.append(
        f"Hola {display_name}, he estado revisando el formulario de descanso que rellenaste, y quiero "
        "compartirte lo que he visto, porque hay unos cambios muy concretos que creo que te van a ayudar "
        "bastante a dormir mejor.\n"
    )
    lines.append("[Pausa breve]\n")
    lines.append("[Diagnóstico general]")
    lines.append(
        "Esto no va de \"dormir mal\" en general, sino de detectar qué está pasando exactamente en tu "
        "rutina. Y en tu caso hay tres áreas que destacan sobre el resto:\n"
    )

    for idx, category in enumerate(top3, start=1):
        tier = tier_of(category["score"])
        lines.append(f"{idx}. {category['emoji']} {category['name']} ({tier['label']})")
        lines.append(f"   Lo que veo: {DIAGNOSIS[category['key']]}\n")

    lines.append("[Pausa]\n")
    lines.append("[Los 3 hábitos que te van a cambiar el juego]")
    lines.append(
        "En lugar de darte veinte cosas para cambiar a la vez, nos vamos a centrar solo en estas tres. "
        "Empieza por aquí, una a la vez si lo necesitas:\n"
    )

    for idx, pick in enumerate(picks, start=1):
        lines.append(f"{idx}. {pick['micro']['t']}.")
        lines.append(f"   Esto ayuda directamente con {pick['cat']['name'].lower()}.\n")

    lines.append("[Cierre]")
    lines.append(
        "Con estos tres cambios, durante las próximas dos semanas deberías empezar a notar diferencia en "
        "cómo te sientes al despertar. No hace falta que sea perfecto desde el primer día: lo importante "
        "es que sea constante. Cualquier duda, aquí estoy para acompañarte.\n"
    )
    lines.append("[Fin del guion]")

    return {
        "text": "\n".join(lines),
        "ranked": ranked,
        "top3": top3,
        "top_categories": [category["name"] for category in top3],
    }


def build_ranked_with_tiers(scores: dict[str, int]) -> list[dict[str, Any]]:
    ranked = sorted(
        [{**category, "score": scores.get(category["key"], 0)} for category in CATEGORIES],
        key=lambda item: item["score"],
        reverse=True,
    )
    for item in ranked:
        item["tier"] = tier_of(item["score"])
    return ranked


def get_questions_payload() -> dict[str, Any]:
    return {
        "total": TOTAL_QUESTIONS,
        "questions": deepcopy(SHUFFLED_QUESTIONS),
        "categories": deepcopy(CATEGORIES),
    }
