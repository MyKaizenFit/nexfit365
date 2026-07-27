export type WorkoutPrSet = {
  completed?: boolean
  weight?: number | string | null
  reps?: number | string | null
}

export type WorkoutPrExercise = {
  exercise_id?: string | number
  exercise?: { id?: string | number; name?: string }
  id?: string | number
  exercise_name?: string
  name?: string
  sets?: WorkoutPrSet[]
}

export type WorkoutPrLog = {
  date: string
  completed?: boolean
  log_exercises?: WorkoutPrExercise[]
  exercises_data?: WorkoutPrExercise[]
}

export type ExercisePrStats = {
  exercise_id: string
  exercise_name: string
  rm: number
  pr_weight: number
  pr_reps: number
  pr_estimated_1rm: number
  totalVolume: number
  lastDate: string
  occurrences: number
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

export function getExercisesFromLog(log: WorkoutPrLog): WorkoutPrExercise[] {
  if (log.log_exercises && log.log_exercises.length > 0) {
    return log.log_exercises.map((logEx) => ({
      exercise_id: logEx.exercise?.id ?? logEx.exercise_id ?? logEx.id,
      exercise_name: logEx.exercise_name,
      sets: (logEx.sets || []).map((s) => ({
        completed: s.completed !== false,
        weight: s.weight,
        reps: s.reps,
      })),
    }))
  }
  if (log.exercises_data && log.exercises_data.length > 0) {
    return log.exercises_data
  }
  return []
}

/** PR/RM por ejercicio a partir de logs completados. RM acepta peso sin reps (sesiones RPE). */
export function computeExercisePrStats(workoutLogs: WorkoutPrLog[]): ExercisePrStats[] {
  const stats: Record<string, ExercisePrStats> = {}

  for (const log of workoutLogs) {
    if (!log.completed) continue
    const exercisesData = getExercisesFromLog(log)
    if (exercisesData.length === 0) continue

    for (const exerciseData of exercisesData) {
      const exerciseId = String(
        exerciseData.exercise_id ?? exerciseData.exercise?.id ?? exerciseData.id ?? 'unknown'
      )
      const exerciseName =
        exerciseData.exercise_name || exerciseData.exercise?.name || exerciseData.name || 'Ejercicio desconocido'
      const sets = exerciseData.sets || []

      if (!stats[exerciseId]) {
        stats[exerciseId] = {
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          rm: 0,
          pr_weight: 0,
          pr_reps: 0,
          pr_estimated_1rm: 0,
          totalVolume: 0,
          lastDate: log.date,
          occurrences: 0,
        }
      }

      let maxOneRepWeight = 0
      let maxWeightAnyReps = stats[exerciseId].rm
      let bestEstimatedOneRM = stats[exerciseId].pr_estimated_1rm
      let bestEstimatedWeight = stats[exerciseId].pr_weight
      let bestEstimatedReps = stats[exerciseId].pr_reps
      let volume = 0

      for (const set of sets) {
        if (set.completed === false) continue
        const weight =
          set.weight !== null && set.weight !== undefined ? parseFloat(String(set.weight)) : null
        const reps =
          set.reps !== null && set.reps !== undefined ? parseInt(String(set.reps), 10) : null
        if (weight === null || Number.isNaN(weight) || weight <= 0) continue

        if (weight > maxWeightAnyReps) {
          maxWeightAnyReps = weight
        }

        if (reps !== null && !Number.isNaN(reps) && reps > 0) {
          if (reps === 1 && weight > maxOneRepWeight) {
            maxOneRepWeight = weight
          }
          const estimatedOneRM = estimateOneRepMax(weight, reps)
          if (estimatedOneRM > bestEstimatedOneRM) {
            bestEstimatedOneRM = estimatedOneRM
            bestEstimatedWeight = weight
            bestEstimatedReps = reps
          }
          volume += weight * reps
        }
      }

      const rm = maxOneRepWeight > 0 ? maxOneRepWeight : maxWeightAnyReps
      if (rm > 0 || bestEstimatedOneRM > 0 || volume > 0) {
        stats[exerciseId].rm = rm
        stats[exerciseId].pr_estimated_1rm = bestEstimatedOneRM
        stats[exerciseId].pr_weight = bestEstimatedWeight
        stats[exerciseId].pr_reps = bestEstimatedReps
        stats[exerciseId].totalVolume += volume
        stats[exerciseId].occurrences += 1
        if (new Date(log.date) > new Date(stats[exerciseId].lastDate)) {
          stats[exerciseId].lastDate = log.date
        }
      }
    }
  }

  return Object.values(stats).sort((a, b) => b.totalVolume - a.totalVolume)
}
