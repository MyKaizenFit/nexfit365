#!/usr/bin/env python3
"""
Script para poblar ejercicios con videos del Google Drive
Solo incluye ejercicios que tienen video disponible

Google Drive Folder: https://drive.google.com/drive/folders/1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import Exercise

# =============================================================================
# EJERCICIOS CON VIDEO DISPONIBLE EN GOOGLE DRIVE
# =============================================================================
# Cada ejercicio incluye:
# - name: Nombre exacto (coincide con el archivo de video)
# - description: Descripción breve del ejercicio
# - instructions: Instrucciones detalladas paso a paso
# - category: Categoría principal
# - muscle_groups: Lista de músculos trabajados
# - equipment: Equipamiento necesario
# - difficulty: Nivel de dificultad

EXERCISES_WITH_VIDEOS = [
    # =========================================================================
    # PECHO
    # =========================================================================
    {
        "name": "Press Banca en Multipower",
        "video_filename": "PRES BANCA en MULTIPOWER.MOV",
        "description": "Ejercicio fundamental para desarrollar el pecho, ejecutado en máquina Smith para mayor estabilidad y seguridad.",
        "instructions": """1. Acuéstate en el banco con los pies firmemente apoyados en el suelo.
2. Agarra la barra con las manos ligeramente más abiertas que el ancho de hombros.
3. Desbloquea la barra y bájala controladamente hasta tocar el pecho (zona media-baja del esternón).
4. Empuja la barra hacia arriba hasta extender los brazos sin bloquear los codos.
5. Mantén los omóplatos retraídos y el pecho elevado durante todo el movimiento.
6. Respira: inhala al bajar, exhala al empujar.""",
        "category": "strength",
        "muscle_groups": ["pectorales", "tríceps", "deltoides anterior"],
        "equipment": ["multipower", "banco plano"],
        "difficulty": "beginner"
    },
    {
        "name": "Press Banca Inclinado en Multipower",
        "video_filename": "PRES BANCA INCLINADO en MULTIPOWER.MOV",
        "description": "Variante inclinada del press de banca que enfatiza la porción superior del pecho (pectoral clavicular).",
        "instructions": """1. Ajusta el banco a una inclinación de 30-45 grados.
2. Acuéstate con la espalda bien apoyada y los pies en el suelo.
3. Agarra la barra con un agarre ligeramente más ancho que los hombros.
4. Desbloquea y baja la barra hacia la parte superior del pecho (cerca de las clavículas).
5. Empuja hacia arriba siguiendo la línea de las guías del multipower.
6. Mantén los codos a unos 45-60 grados del torso.""",
        "category": "strength",
        "muscle_groups": ["pectorales", "pectoral clavicular", "deltoides anterior", "tríceps"],
        "equipment": ["multipower", "banco inclinado"],
        "difficulty": "beginner"
    },
    {
        "name": "Press Banca Agarre Abierto en Multipower",
        "video_filename": "PRES BANCA AGARRE ABIERTO en MULTIPOWER.MOV",
        "description": "Press de banca con agarre amplio para mayor énfasis en el estiramiento y contracción del pectoral.",
        "instructions": """1. Acuéstate en el banco plano del multipower.
2. Toma la barra con un agarre más amplio de lo normal (1.5-2 veces el ancho de hombros).
3. Mantén los codos apuntando hacia afuera durante el movimiento.
4. Baja la barra hasta tocar el pecho en la zona media.
5. Empuja hacia arriba enfocándote en apretar los pectorales.
6. El rango de movimiento será menor debido al agarre amplio.""",
        "category": "strength",
        "muscle_groups": ["pectorales", "deltoides anterior"],
        "equipment": ["multipower", "banco plano"],
        "difficulty": "intermediate"
    },
    {
        "name": "Press Banca Agarre Estrecho en Multipower",
        "video_filename": "PRES BANCA AGARRE ESTRECHO en MULTIPOWER.MOV",
        "description": "Variante con agarre cerrado que transfiere mayor énfasis a los tríceps mientras trabaja el pecho.",
        "instructions": """1. Acuéstate en el banco con la espalda bien apoyada.
2. Agarra la barra con las manos separadas al ancho de los hombros o ligeramente menos.
3. Mantén los codos cerca del cuerpo durante todo el movimiento.
4. Baja la barra hasta la parte baja del pecho.
5. Empuja hacia arriba enfocándote en la extensión de los tríceps.
6. No separes los codos hacia afuera.""",
        "category": "strength",
        "muscle_groups": ["tríceps", "pectorales", "deltoides anterior"],
        "equipment": ["multipower", "banco plano"],
        "difficulty": "beginner"
    },
    {
        "name": "Pull Over en Máquina",
        "video_filename": "PULL OVER en MÁQUINA.MOV",
        "description": "Ejercicio de aislamiento que trabaja el dorsal y el serrato, expandiendo la caja torácica.",
        "instructions": """1. Siéntate en la máquina con la espalda bien apoyada.
2. Ajusta la altura del asiento para que los codos queden alineados con el eje de rotación.
3. Coloca los codos en los cojines y agarra las manijas.
4. Desde arriba, empuja hacia abajo en un arco hasta que los brazos queden cerca del torso.
5. Regresa controladamente a la posición inicial sintiendo el estiramiento.
6. Mantén una ligera flexión en los codos durante todo el movimiento.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "serrato anterior", "pectorales"],
        "equipment": ["máquina pullover"],
        "difficulty": "beginner"
    },
    {
        "name": "Pull Over en Polea Alta",
        "video_filename": "PULL OVER en POLEA ALTA.MOV",
        "description": "Variante con cable que proporciona tensión constante para trabajar dorsales y serrato.",
        "instructions": """1. Colócate de pie frente a una polea alta con una cuerda o barra recta.
2. Inclina ligeramente el torso hacia adelante con las rodillas semiflexionadas.
3. Con los brazos casi extendidos, agarra el accesorio por encima de la cabeza.
4. Tira hacia abajo en un arco hasta que las manos lleguen a la altura de los muslos.
5. Contrae los dorsales al final del movimiento.
6. Regresa controladamente manteniendo la tensión.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "serrato anterior", "tríceps"],
        "equipment": ["polea alta", "cuerda o barra"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # ESPALDA
    # =========================================================================
    {
        "name": "Jalón al Pecho Agarre Prono",
        "video_filename": "JALÓN al PECHO AGARRE PRONO.MOV",
        "description": "Ejercicio fundamental para desarrollar la anchura de la espalda, especialmente los dorsales.",
        "instructions": """1. Siéntate en la máquina con los muslos bien sujetos bajo los cojines.
2. Agarra la barra con las palmas mirando hacia adelante (agarre prono), manos más anchas que los hombros.
3. Inclina ligeramente el torso hacia atrás (unos 10-15 grados).
4. Tira de la barra hacia la parte superior del pecho, llevando los codos hacia abajo y atrás.
5. Aprieta los omóplatos juntos en la contracción máxima.
6. Regresa controladamente hasta estirar completamente los dorsales.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "bíceps", "trapecio"],
        "equipment": ["máquina de jalones", "barra larga"],
        "difficulty": "beginner"
    },
    {
        "name": "Jalón al Pecho Agarre Supino",
        "video_filename": "JALÓN al PECHO AGARRE SUPINO.MOV",
        "description": "Variante con agarre invertido que aumenta la participación del bíceps y trabaja diferente ángulo del dorsal.",
        "instructions": """1. Siéntate con los muslos asegurados bajo los cojines.
2. Agarra la barra con las palmas mirando hacia ti (agarre supino), manos al ancho de hombros.
3. Mantén el pecho elevado y los hombros hacia atrás.
4. Tira de la barra hacia el pecho, enfocándote en llevar los codos hacia atrás.
5. Contrae fuertemente los dorsales y bíceps en el punto final.
6. Extiende los brazos completamente en cada repetición.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "bíceps", "romboides"],
        "equipment": ["máquina de jalones", "barra larga"],
        "difficulty": "beginner"
    },
    {
        "name": "Jalón al Pecho Agarre Estrecho",
        "video_filename": "JALÓN al PECHO AGARRE ESTRECHO.MOV",
        "description": "Jalón con agarre cerrado que enfatiza la porción central e inferior del dorsal.",
        "instructions": """1. Utiliza un accesorio de agarre cerrado (triángulo o barra V).
2. Siéntate con el torso erguido y los muslos asegurados.
3. Agarra con las palmas enfrentadas (agarre neutro).
4. Tira hacia el pecho medio-bajo, llevando los codos hacia las costillas.
5. Mantén los codos cerca del cuerpo durante todo el movimiento.
6. Estira completamente arriba para maximizar el rango.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "bíceps"],
        "equipment": ["máquina de jalones", "accesorio agarre cerrado"],
        "difficulty": "beginner"
    },
    {
        "name": "Jalón al Pecho Agarre Unilateral",
        "video_filename": "JALÓN al PECHO AGARRE UNILATERAL.MOV",
        "description": "Versión unilateral que permite corregir desequilibrios musculares y mayor rango de movimiento.",
        "instructions": """1. Usa una manija de un solo agarre en la polea alta.
2. Siéntate de lado o frente a la máquina.
3. Agarra la manija con una mano, el otro brazo puede apoyarse para estabilidad.
4. Tira hacia el costado del pecho, rotando ligeramente el torso.
5. Exprime el dorsal en la contracción máxima.
6. Completa todas las repeticiones de un lado antes de cambiar.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "bíceps"],
        "equipment": ["polea alta", "manija simple"],
        "difficulty": "intermediate"
    },
    {
        "name": "Jalón al Pecho en Máquina",
        "video_filename": "JALÓN al PECHO EN MÁQUINA.MOV",
        "description": "Jalón guiado en máquina específica para un movimiento más controlado y aislado.",
        "instructions": """1. Ajusta el asiento para que los cojines sujeten bien los muslos.
2. Agarra las manijas con el agarre que proporciona la máquina.
3. Mantén el pecho elevado y la espalda ligeramente arqueada.
4. Tira las manijas hacia el pecho superior.
5. Contrae los dorsales y mantén un segundo.
6. Regresa controladamente sin soltar la tensión.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "bíceps"],
        "equipment": ["máquina de jalón"],
        "difficulty": "beginner"
    },
    {
        "name": "Remo Agarre Neutro en Polea Baja",
        "video_filename": "REMO AGARRE NEUTRO en POLEA BAJA.MOV",
        "description": "Remo sentado con agarre neutro que desarrolla grosor en la espalda media.",
        "instructions": """1. Siéntate frente a la polea baja con los pies en los apoyos.
2. Usa un accesorio de agarre neutro (palmas enfrentadas).
3. Mantén la espalda recta, rodillas ligeramente flexionadas.
4. Tira del accesorio hacia el abdomen, llevando los codos hacia atrás.
5. Aprieta los omóplatos juntos en la contracción.
6. Extiende los brazos completamente, dejando que los hombros vayan hacia adelante para estirar.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "trapecio medio", "bíceps"],
        "equipment": ["polea baja", "accesorio agarre neutro"],
        "difficulty": "beginner"
    },
    {
        "name": "Remo Agarre Prono Abierto en Polea Baja",
        "video_filename": "REMO AGARRE PRONO ABIERTO en POLEA BAJA.MOV",
        "description": "Remo con agarre ancho y prono para enfatizar deltoides posterior y trapecio.",
        "instructions": """1. Siéntate frente a la polea baja con una barra larga.
2. Agarra con las palmas hacia abajo, manos más anchas que los hombros.
3. Mantén el torso erguido y estable.
4. Tira hacia el pecho alto/cuello, con los codos apuntando hacia afuera.
5. Enfócate en juntar los omóplatos y contraer el trapecio.
6. Baja controladamente manteniendo la tensión.""",
        "category": "strength",
        "muscle_groups": ["trapecio", "romboides", "deltoides posterior", "dorsales"],
        "equipment": ["polea baja", "barra larga"],
        "difficulty": "intermediate"
    },
    {
        "name": "Remo Alto Unilateral en Máquina",
        "video_filename": "REMO ALTO UNILATERAL en MÁQUINA.MOV",
        "description": "Remo unilateral enfocado en el deltoides posterior y trapecio superior.",
        "instructions": """1. Colócate frente a la máquina o polea a una altura media-alta.
2. Agarra la manija con una mano, el cuerpo ligeramente girado.
3. Tira hacia el hombro del mismo lado, con el codo elevado.
4. Mantén el codo a la altura del hombro o ligeramente más alto.
5. Contrae el deltoides posterior y trapecio.
6. Completa un lado antes de cambiar al otro.""",
        "category": "strength",
        "muscle_groups": ["deltoides posterior", "trapecio", "romboides"],
        "equipment": ["máquina de remo o polea"],
        "difficulty": "intermediate"
    },
    {
        "name": "Remo con Barra",
        "video_filename": "REMO con BARRA.MOV",
        "description": "Ejercicio compuesto fundamental para desarrollar fuerza y masa en toda la espalda.",
        "instructions": """1. De pie con los pies al ancho de hombros, agarra la barra con agarre prono.
2. Flexiona las caderas e inclina el torso hacia adelante (45-60 grados).
3. Mantén la espalda recta y las rodillas ligeramente flexionadas.
4. Tira de la barra hacia el abdomen bajo, llevando los codos hacia atrás.
5. Aprieta los omóplatos al final del movimiento.
6. Baja controladamente hasta extender los brazos.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "trapecio", "romboides", "erectores espinales", "bíceps"],
        "equipment": ["barra", "discos"],
        "difficulty": "intermediate"
    },
    {
        "name": "Remo con Mancuerna Unilateral",
        "video_filename": "REMO con MANCUERNA UNILATERAL.mov",
        "description": "Remo unilateral que permite mayor rango de movimiento y corrección de desequilibrios.",
        "instructions": """1. Coloca una rodilla y una mano en un banco para apoyo.
2. La otra pierna queda en el suelo, ligeramente atrás para estabilidad.
3. Agarra la mancuerna con la mano libre, brazo extendido.
4. Tira de la mancuerna hacia la cadera, llevando el codo hacia el techo.
5. Rota ligeramente el torso para maximizar la contracción.
6. Baja controladamente sintiendo el estiramiento del dorsal.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "romboides", "bíceps"],
        "equipment": ["mancuerna", "banco"],
        "difficulty": "beginner"
    },
    {
        "name": "Dominada Prona",
        "video_filename": "DOMINADA PRONA.MOV",
        "description": "El ejercicio rey para desarrollar la espalda, especialmente la anchura del dorsal.",
        "instructions": """1. Cuélgate de la barra con agarre prono, manos más anchas que los hombros.
2. Comienza con los brazos completamente extendidos (dead hang).
3. Inicia el movimiento retrayendo los omóplatos.
4. Tira de tu cuerpo hacia arriba hasta que la barbilla supere la barra.
5. Mantén el core activado y evita balanceos.
6. Baja de forma controlada hasta la extensión completa.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "bíceps", "trapecio", "romboides"],
        "equipment": ["barra de dominadas"],
        "difficulty": "advanced"
    },
    {
        "name": "Dominada con Banda Elástica",
        "video_filename": "DOMINADA con BANDA ELÁSTICA.MOV",
        "description": "Versión asistida de la dominada para quienes aún no pueden realizar dominadas completas.",
        "instructions": """1. Enrolla una banda elástica en la barra de dominadas.
2. Coloca una rodilla o pie en el lazo de la banda.
3. Agarra la barra con agarre prono, más ancho que los hombros.
4. La banda te ayudará a subir, aprovecha para practicar la técnica.
5. Tira hasta que la barbilla supere la barra.
6. Baja controladamente, la banda también asiste en el descenso.""",
        "category": "strength",
        "muscle_groups": ["dorsales", "bíceps", "trapecio"],
        "equipment": ["barra de dominadas", "banda elástica"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # HOMBROS
    # =========================================================================
    {
        "name": "Press Militar en Multipower",
        "video_filename": "PRES MILITAR en MULTIPOWER.MOV",
        "description": "Press de hombros en máquina guiada para desarrollar los deltoides de forma segura.",
        "instructions": """1. Siéntate en un banco con respaldo bajo la barra del multipower.
2. La barra debe quedar a la altura del mentón cuando estés sentado.
3. Agarra la barra con las manos ligeramente más anchas que los hombros.
4. Desbloquea y empuja la barra hacia arriba hasta extender los brazos.
5. Baja controladamente hasta que la barra llegue a la altura de la barbilla.
6. Mantén el core apretado y la espalda contra el respaldo.""",
        "category": "strength",
        "muscle_groups": ["deltoides anterior", "deltoides lateral", "tríceps"],
        "equipment": ["multipower", "banco con respaldo"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # BÍCEPS
    # =========================================================================
    {
        "name": "Curl de Bíceps Bayesian",
        "video_filename": "CURL de BÍCEPS BAYESIAN.MOV",
        "description": "Curl en polea con el brazo detrás del cuerpo para máximo estiramiento y contracción del bíceps.",
        "instructions": """1. Colócate de espaldas a una polea baja, agarra la manija con una mano.
2. Da un paso adelante para que el brazo quede extendido detrás de ti.
3. El hombro debe estar en extensión (brazo hacia atrás).
4. Flexiona el codo llevando la mano hacia el hombro.
5. Contrae el bíceps en la parte superior.
6. Baja controladamente sintiendo el estiramiento máximo.""",
        "category": "strength",
        "muscle_groups": ["bíceps", "braquial"],
        "equipment": ["polea baja", "manija simple"],
        "difficulty": "intermediate"
    },
    {
        "name": "Curl de Bíceps en Polea con Barra Z",
        "video_filename": "CURL de BÍCEPS en POLEA con BARRA Z.MOV",
        "description": "Curl con barra EZ en polea baja para tensión constante en el bíceps.",
        "instructions": """1. Colócate frente a una polea baja con barra EZ.
2. Agarra la barra con las manos en las curvas, palmas hacia arriba.
3. Mantén los codos pegados a los costados.
4. Flexiona los codos llevando la barra hacia los hombros.
5. Aprieta los bíceps en la contracción máxima.
6. Baja de forma controlada sin mover los codos.""",
        "category": "strength",
        "muscle_groups": ["bíceps", "braquial", "braquiorradial"],
        "equipment": ["polea baja", "barra EZ"],
        "difficulty": "beginner"
    },
    {
        "name": "Curl de Bíceps en Polea Unilateral",
        "video_filename": "CURL de BÍCEPS en POLEA UNILATERAL.MOV",
        "description": "Curl unilateral en polea para trabajar cada bíceps de forma independiente.",
        "instructions": """1. Colócate de lado o frente a una polea baja con manija simple.
2. Agarra la manija con una mano, palma hacia arriba.
3. Mantén el codo fijo al costado del cuerpo.
4. Flexiona el codo llevando la mano hacia el hombro.
5. Gira la muñeca (supinación) al subir para mayor contracción.
6. Baja controladamente y repite. Cambia de lado al terminar.""",
        "category": "strength",
        "muscle_groups": ["bíceps"],
        "equipment": ["polea baja", "manija simple"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # TRÍCEPS
    # =========================================================================
    {
        "name": "Extensión de Tríceps en Polea Alta",
        "video_filename": "EXTENSIÓN de TRÍCEPS en POLEA ALTA.MOV",
        "description": "Ejercicio de aislamiento clásico para desarrollar los tríceps.",
        "instructions": """1. Colócate frente a una polea alta con cuerda o barra.
2. Agarra el accesorio con ambas manos, codos flexionados a los lados.
3. Los codos deben permanecer fijos durante todo el movimiento.
4. Extiende los brazos hacia abajo, empujando hasta la extensión completa.
5. Con cuerda: separa las manos al final para mayor contracción.
6. Regresa controladamente sin subir los codos.""",
        "category": "strength",
        "muscle_groups": ["tríceps"],
        "equipment": ["polea alta", "cuerda o barra"],
        "difficulty": "beginner"
    },
    {
        "name": "Extensión de Tríceps en Polea Alta con Barra Z",
        "video_filename": "EXTENSIÓN DE TRÍCEPS EN POLEA ALTA CON BARRA Z.MOV",
        "description": "Extensión de tríceps con barra EZ para una posición de muñeca más natural.",
        "instructions": """1. Coloca la barra EZ en la polea alta.
2. Agarra la barra en las curvas con las palmas hacia abajo.
3. Mantén los codos pegados a los costados.
4. Extiende los brazos completamente hacia abajo.
5. Aprieta los tríceps en la extensión máxima.
6. Flexiona los codos para volver, sin que suban del punto inicial.""",
        "category": "strength",
        "muscle_groups": ["tríceps"],
        "equipment": ["polea alta", "barra EZ"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # CUÁDRICEPS
    # =========================================================================
    {
        "name": "Extensión de Cuádriceps en Máquina",
        "video_filename": "EXTENSIÓN de CUÁDRICEPS en MÁQUINA.MOV",
        "description": "Ejercicio de aislamiento para los cuádriceps, excelente para definición y rehabilitación.",
        "instructions": """1. Siéntate en la máquina con la espalda bien apoyada.
2. Ajusta el rodillo para que quede sobre los tobillos.
3. Sujeta las manijas laterales para estabilidad.
4. Extiende las piernas hasta que queden completamente rectas.
5. Contrae los cuádriceps en la parte superior, mantén 1-2 segundos.
6. Baja controladamente hasta 90 grados de flexión.""",
        "category": "strength",
        "muscle_groups": ["cuádriceps"],
        "equipment": ["máquina de extensión de cuádriceps"],
        "difficulty": "beginner"
    },
    {
        "name": "Prensa",
        "video_filename": "PRENSA.MOV",
        "description": "Ejercicio compuesto para piernas que permite mover grandes cargas de forma segura.",
        "instructions": """1. Siéntate en la prensa con la espalda y glúteos bien apoyados.
2. Coloca los pies en la plataforma al ancho de hombros.
3. Desbloquea los seguros y baja el peso flexionando las rodillas.
4. Baja hasta que las rodillas formen aproximadamente 90 grados.
5. Empuja la plataforma extendiendo las piernas sin bloquear las rodillas.
6. Mantén los pies planos y las rodillas alineadas con los pies.""",
        "category": "strength",
        "muscle_groups": ["cuádriceps", "glúteos", "isquiotibiales"],
        "equipment": ["máquina prensa de piernas"],
        "difficulty": "beginner"
    },
    {
        "name": "Prensa Unilateral",
        "video_filename": "PRENSA UNILATERAL.MOV",
        "description": "Prensa con una sola pierna para corregir desequilibrios y mayor activación.",
        "instructions": """1. Siéntate en la prensa con la espalda bien apoyada.
2. Coloca un solo pie en el centro de la plataforma.
3. La otra pierna puede quedar extendida o cruzada.
4. Desbloquea y baja el peso flexionando la rodilla.
5. Empuja hasta extender la pierna sin bloquear.
6. Completa todas las repeticiones antes de cambiar de pierna.""",
        "category": "strength",
        "muscle_groups": ["cuádriceps", "glúteos"],
        "equipment": ["máquina prensa de piernas"],
        "difficulty": "intermediate"
    },
    {
        "name": "Prensa con Pies Arriba",
        "video_filename": "PRENSA con PIES ARRIBA.MOV",
        "description": "Variante de prensa con pies altos para mayor énfasis en glúteos e isquiotibiales.",
        "instructions": """1. Siéntate en la prensa con la espalda bien apoyada.
2. Coloca los pies en la parte ALTA de la plataforma.
3. Los pies deben quedar al ancho de hombros o ligeramente más.
4. Baja el peso hasta que las rodillas se acerquen al pecho.
5. Empuja enfocándote en usar los glúteos y femorales.
6. No bloquees las rodillas en la extensión.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales", "cuádriceps"],
        "equipment": ["máquina prensa de piernas"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # ISQUIOTIBIALES
    # =========================================================================
    {
        "name": "Curl Femoral en Máquina",
        "video_filename": "CURL FEMORAL en MÁQUINA.MOV",
        "description": "Ejercicio de aislamiento esencial para desarrollar los isquiotibiales.",
        "instructions": """1. Acuéstate boca abajo en la máquina de curl femoral.
2. Ajusta el rodillo para que quede justo encima de los talones.
3. Sujeta las manijas para estabilizarte.
4. Flexiona las rodillas llevando los talones hacia los glúteos.
5. Contrae los isquiotibiales en la posición final.
6. Baja controladamente sin dejar caer el peso.""",
        "category": "strength",
        "muscle_groups": ["isquiotibiales", "gemelos"],
        "equipment": ["máquina curl femoral"],
        "difficulty": "beginner"
    },
    {
        "name": "Peso Muerto Rumano en Multipower",
        "video_filename": "PESO MUERTO RUMANO en MULTIPOWER.MOV",
        "description": "Variante de peso muerto enfocada en isquiotibiales y glúteos con mayor seguridad.",
        "instructions": """1. Colócate en el multipower con los pies al ancho de caderas.
2. Agarra la barra con las manos al ancho de hombros.
3. Mantén una ligera flexión en las rodillas (no las bloquees).
4. Empuja las caderas hacia atrás mientras bajas la barra.
5. Baja hasta sentir un buen estiramiento en los isquiotibiales.
6. Sube apretando los glúteos y llevando las caderas hacia adelante.""",
        "category": "strength",
        "muscle_groups": ["isquiotibiales", "glúteos", "erectores espinales"],
        "equipment": ["multipower"],
        "difficulty": "intermediate"
    },
    {
        "name": "Peso Muerto Piernas Rígidas en Multipower",
        "video_filename": "PESO MUERTO PIERNAS RÍGIDAS en MULTIPOWER.MOV",
        "description": "Peso muerto con piernas casi rectas para máximo estiramiento de isquiotibiales.",
        "instructions": """1. Colócate frente al multipower con los pies juntos o separados al ancho de caderas.
2. Agarra la barra con agarre al ancho de hombros.
3. Mantén las piernas lo más rectas posible (mínima flexión de rodillas).
4. Flexiona las caderas bajando la barra por las piernas.
5. Baja hasta donde la flexibilidad lo permita sin redondear la espalda.
6. Sube contrayendo glúteos e isquiotibiales.""",
        "category": "strength",
        "muscle_groups": ["isquiotibiales", "glúteos", "erectores espinales"],
        "equipment": ["multipower"],
        "difficulty": "intermediate"
    },
    {
        "name": "Peso Muerto Sumo en Multipower",
        "video_filename": "PESO MUERTO SUMO en MULTIPOWER.MOV",
        "description": "Peso muerto con postura amplia que enfatiza aductores y glúteos.",
        "instructions": """1. Colócate con los pies muy separados, puntas hacia afuera (45 grados).
2. Agarra la barra con las manos dentro de las piernas.
3. La espalda debe estar recta, pecho elevado.
4. Baja flexionando rodillas y caderas simultáneamente.
5. Las rodillas deben seguir la dirección de los pies.
6. Sube empujando el suelo y apretando los glúteos.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "aductores", "cuádriceps", "isquiotibiales"],
        "equipment": ["multipower"],
        "difficulty": "intermediate"
    },
    {
        "name": "Peso Muerto Unilateral en Multipower",
        "video_filename": "PESO MUERTO UNILATERAL en MULTIPOWER.MOV",
        "description": "Peso muerto a una pierna para trabajar equilibrio, core y cadena posterior unilateralmente.",
        "instructions": """1. Colócate frente al multipower apoyado en una sola pierna.
2. La pierna trasera puede elevarse ligeramente para equilibrio.
3. Agarra la barra y baja flexionando la cadera.
4. Mantén la espalda recta mientras la pierna trasera se eleva.
5. Baja hasta donde la flexibilidad y equilibrio lo permitan.
6. Sube contrayendo glúteo e isquiotibial de la pierna de apoyo.""",
        "category": "strength",
        "muscle_groups": ["isquiotibiales", "glúteos", "core"],
        "equipment": ["multipower"],
        "difficulty": "advanced"
    },
    {
        "name": "Buenos Días en Multipower",
        "video_filename": "BUENOS DÍAS en MULTIPOWER.MOV",
        "description": "Ejercicio de bisagra de cadera excelente para isquiotibiales y erectores espinales.",
        "instructions": """1. Coloca la barra del multipower sobre los trapecios (no en el cuello).
2. Pies al ancho de hombros, rodillas ligeramente flexionadas.
3. Mantén la espalda recta y el core apretado.
4. Inclínate hacia adelante empujando las caderas hacia atrás.
5. Baja hasta que el torso esté casi paralelo al suelo.
6. Sube contrayendo isquiotibiales y glúteos.""",
        "category": "strength",
        "muscle_groups": ["isquiotibiales", "glúteos", "erectores espinales"],
        "equipment": ["multipower"],
        "difficulty": "intermediate"
    },
    
    # =========================================================================
    # GLÚTEOS
    # =========================================================================
    {
        "name": "Hip Thrust en Multipower Glute Builder",
        "video_filename": "HIP THRUST en MULTIPOWER GLUTE BUILDER.MOV",
        "description": "El mejor ejercicio para desarrollar y fortalecer los glúteos de forma aislada.",
        "instructions": """1. Siéntate en el suelo con la espalda media apoyada en el banco.
2. Coloca la barra del multipower sobre la cadera (usa protector).
3. Los pies deben estar planos en el suelo, rodillas a 90 grados.
4. Empuja las caderas hacia arriba hasta que el torso quede paralelo al suelo.
5. Aprieta fuertemente los glúteos en la posición superior.
6. Baja controladamente hasta que los glúteos casi toquen el suelo.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales"],
        "equipment": ["multipower", "banco", "protector de barra"],
        "difficulty": "beginner"
    },
    {
        "name": "Prensa de Glúteo en Multipower",
        "video_filename": "PRENSA de GLÚTEO en MULTIPOWER.MOV",
        "description": "Ejercicio específico para activar y desarrollar los glúteos en el multipower.",
        "instructions": """1. Colócate bajo el multipower con los pies en posición elevada.
2. La barra debe quedar sobre las caderas.
3. Empuja hacia arriba extendiendo completamente las caderas.
4. Enfócate en contraer los glúteos en la parte superior.
5. Baja controladamente manteniendo la tensión.
6. Mantén el core activado durante todo el movimiento.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales"],
        "equipment": ["multipower"],
        "difficulty": "intermediate"
    },
    {
        "name": "Puente de Glúteo",
        "video_filename": "PUENTE DE GLÚTEO.MOV",
        "description": "Ejercicio básico pero efectivo para activar y fortalecer los glúteos.",
        "instructions": """1. Acuéstate boca arriba con las rodillas flexionadas.
2. Los pies deben estar planos en el suelo, cerca de los glúteos.
3. Los brazos quedan a los lados para estabilidad.
4. Empuja las caderas hacia arriba apretando los glúteos.
5. Forma una línea recta desde hombros hasta rodillas.
6. Mantén 2-3 segundos arriba y baja controladamente.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales"],
        "equipment": ["ninguno"],
        "difficulty": "beginner"
    },
    {
        "name": "Puente de Glúteo con Peso",
        "video_filename": "PUENTE de GLÚTEO con PESO.MOV",
        "description": "Puente de glúteo con carga adicional para mayor resistencia y desarrollo muscular.",
        "instructions": """1. Acuéstate boca arriba con un disco o barra sobre las caderas.
2. Rodillas flexionadas, pies planos en el suelo.
3. Sujeta el peso con las manos para estabilizarlo.
4. Empuja las caderas hacia arriba contrayendo los glúteos.
5. Eleva hasta formar una línea recta hombros-caderas-rodillas.
6. Baja controladamente y repite.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales"],
        "equipment": ["disco", "barra"],
        "difficulty": "beginner"
    },
    {
        "name": "Patada de Glúteo en Máquina",
        "video_filename": "PATADA de GLÚTEO en MÁQUINA.MOV",
        "description": "Ejercicio de aislamiento en máquina para trabajar el glúteo mayor.",
        "instructions": """1. Colócate en la máquina de patada de glúteo con una rodilla apoyada.
2. El pie de trabajo se coloca contra la plataforma.
3. Agarra las manijas para estabilizarte.
4. Empuja la plataforma hacia atrás extendiendo la cadera.
5. Contrae el glúteo en la extensión máxima.
6. Regresa controladamente sin perder tensión.""",
        "category": "strength",
        "muscle_groups": ["glúteos"],
        "equipment": ["máquina de patada de glúteo"],
        "difficulty": "beginner"
    },
    {
        "name": "Patada de Glúteo en Polea Media",
        "video_filename": "PATADA de GLÚTEO en POLEA MEDIA.MOV",
        "description": "Patada de glúteo con cable para tensión constante y mayor control.",
        "instructions": """1. Conecta una tobillera a una polea baja o media.
2. Colócate frente a la máquina, manos en un soporte.
3. Extiende la pierna hacia atrás en un movimiento controlado.
4. Mantén la rodilla ligeramente flexionada.
5. Contrae el glúteo en la extensión máxima.
6. Regresa controladamente y repite. Cambia de pierna.""",
        "category": "strength",
        "muscle_groups": ["glúteos"],
        "equipment": ["polea", "tobillera"],
        "difficulty": "beginner"
    },
    {
        "name": "Hiperextensiones",
        "video_filename": "HIPEREXTENSIONES.MOV",
        "description": "Ejercicio para fortalecer la cadena posterior: glúteos, isquiotibiales y erectores.",
        "instructions": """1. Colócate en el banco de hiperextensiones con los muslos apoyados.
2. Los pies quedan sujetos en los rodillos traseros.
3. Cruza los brazos sobre el pecho o detrás de la cabeza.
4. Baja el torso flexionando las caderas controladamente.
5. Sube extendiendo las caderas hasta formar una línea recta.
6. No hiperextiendas la espalda; detente en la posición neutral.""",
        "category": "strength",
        "muscle_groups": ["erectores espinales", "glúteos", "isquiotibiales"],
        "equipment": ["banco de hiperextensiones"],
        "difficulty": "beginner"
    },
    {
        "name": "Hiperextensiones con Lastre",
        "video_filename": "HIPEREXTENSIONES con LASTRE.MOV",
        "description": "Hiperextensiones con peso adicional para mayor intensidad.",
        "instructions": """1. Colócate en el banco de hiperextensiones.
2. Sujeta un disco contra el pecho o detrás de la cabeza.
3. Mantén el disco bien sujeto durante todo el movimiento.
4. Baja controladamente flexionando las caderas.
5. Sube hasta la posición neutral contrayendo glúteos y espalda.
6. Evita balanceos o movimientos bruscos.""",
        "category": "strength",
        "muscle_groups": ["erectores espinales", "glúteos", "isquiotibiales"],
        "equipment": ["banco de hiperextensiones", "disco"],
        "difficulty": "intermediate"
    },
    {
        "name": "Hiperextensiones en Máquina Glute Builder",
        "video_filename": "HIPEREXTENSIONES en MÁQUINA GLUTE BUILDER.MOV",
        "description": "Hiperextensiones en máquina especializada para mayor enfoque en glúteos.",
        "instructions": """1. Ajusta la máquina glute builder a tu altura.
2. Colócate con las caderas en el borde del cojín.
3. Los pies quedan asegurados en la plataforma.
4. Baja el torso controladamente hacia abajo.
5. Sube contrayendo fuertemente los glúteos.
6. Mantén el core activado para proteger la espalda.""",
        "category": "strength",
        "muscle_groups": ["glúteos", "isquiotibiales", "erectores espinales"],
        "equipment": ["máquina glute builder"],
        "difficulty": "beginner"
    },
    {
        "name": "Abducción en Polea",
        "video_filename": "ABDUCCIÓN en POLEA.MOV",
        "description": "Ejercicio de aislamiento para el glúteo medio y abductores.",
        "instructions": """1. Conecta una tobillera a una polea baja.
2. Colócate de lado a la máquina, la pierna de trabajo más alejada.
3. Apóyate en un soporte con la mano cercana a la máquina.
4. Eleva la pierna lateralmente, alejándola del cuerpo.
5. Contrae el glúteo medio en la parte alta del movimiento.
6. Baja controladamente y repite. Cambia de lado.""",
        "category": "strength",
        "muscle_groups": ["glúteo medio", "abductores"],
        "equipment": ["polea baja", "tobillera"],
        "difficulty": "beginner"
    },
    {
        "name": "Clamshells",
        "video_filename": "CLAMSHELLS.MOV",
        "description": "Ejercicio de activación para el glúteo medio, excelente para calentamiento o rehabilitación.",
        "instructions": """1. Acuéstate de lado con las rodillas flexionadas a 45 grados.
2. Los pies deben estar juntos, uno sobre el otro.
3. Mantén las caderas estables, sin rotar hacia atrás.
4. Eleva la rodilla superior como abriendo una almeja.
5. Contrae el glúteo en la apertura máxima.
6. Baja controladamente y repite. Cambia de lado.""",
        "category": "strength",
        "muscle_groups": ["glúteo medio", "abductores"],
        "equipment": ["banda elástica (opcional)"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # GEMELOS
    # =========================================================================
    {
        "name": "Elevación de Talón en Multipower",
        "video_filename": "ELEVACIÓN de TALÓN en MULTIPOWER.MOV",
        "description": "Ejercicio para desarrollar los gemelos con la estabilidad del multipower.",
        "instructions": """1. Coloca la barra del multipower sobre los trapecios.
2. Pon las puntas de los pies en un escalón o disco elevado.
3. Los talones deben quedar en el aire.
4. Elévate sobre las puntas de los pies lo más alto posible.
5. Contrae los gemelos en la parte superior.
6. Baja los talones por debajo del nivel del escalón para estirar.""",
        "category": "strength",
        "muscle_groups": ["gemelos", "sóleo"],
        "equipment": ["multipower", "escalón o disco"],
        "difficulty": "beginner"
    },
    
    # =========================================================================
    # CORE / ABDOMINALES
    # =========================================================================
    {
        "name": "Crunch Abdominal en Polea Alta",
        "video_filename": "CRUNCH ABDOMINAL en POLEA ALTA.MOV",
        "description": "Crunch con resistencia para desarrollar los abdominales con carga progresiva.",
        "instructions": """1. Arrodíllate frente a una polea alta con cuerda.
2. Agarra la cuerda con ambas manos junto a las sienes.
3. Mantén las caderas fijas, no las muevas.
4. Flexiona el tronco llevando los codos hacia las rodillas.
5. Contrae fuertemente los abdominales.
6. Regresa controladamente sin arquear la espalda.""",
        "category": "strength",
        "muscle_groups": ["recto abdominal", "oblicuos"],
        "equipment": ["polea alta", "cuerda"],
        "difficulty": "beginner"
    },
]


def get_google_drive_video_url(filename):
    """
    Construye la URL de streaming de Google Drive basada en el nombre del archivo.
    Por ahora usamos una URL directa a la carpeta; en el futuro se puede mapear con IDs específicos.
    """
    # La carpeta de Google Drive es pública
    folder_url = "https://drive.google.com/drive/folders/1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG"
    
    # Para streaming directo necesitaríamos el file ID de cada video
    # Por ahora almacenamos la referencia al archivo
    return f"gdrive://{filename}"


def main():
    
    # Confirmar antes de eliminar
    existing_count = Exercise.objects.count()
    
    # Opción para solo agregar sin eliminar
    import sys
    if "--keep-existing" not in sys.argv:
        Exercise.objects.all().delete()
    else:
    
    
    created = 0
    errors = []
    
    for ex_data in EXERCISES_WITH_VIDEOS:
        try:
            # Construir URL de video
            video_ref = get_google_drive_video_url(ex_data["video_filename"])
            
            exercise = Exercise.objects.create(
                name=ex_data["name"],
                description=ex_data["description"],
                instructions=ex_data["instructions"],
                category=ex_data["category"],
                muscle_groups=ex_data["muscle_groups"],
                equipment=ex_data["equipment"],
                difficulty=ex_data["difficulty"],
                video_url=video_ref,
                is_system=True,
                is_active=True
            )
            
            created += 1
            
        except Exception as e:
            error_msg = f"  ❌ {ex_data['name']}: {str(e)}"
            errors.append(error_msg)
    
    
    if errors:
        for error in errors:


if __name__ == "__main__":
    main()



