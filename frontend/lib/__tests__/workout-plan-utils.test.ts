import {
  DAY_NAME_TO_NUMBER,
  getWeekdayNumber,
  getPlanDayForWeekday,
  getPlanDayForDate,
  getPlanTrainingWeekdays,
  getPlanWeeklyGoal,
  getProgramWeekForDate,
  getProgramWeekForAnchor,
  globalDayNumberForProgramWeek,
  getProgramLifecycleStatus,
  isProgramCompleted,
  isMultiWeekPlan,
  isProgramWeekInRange,
  planDurationWeeksFromPlan,
  getTodaysPlanDay,
  isPlanTrainingWeekday,
  weekNumberFromDayNumber,
  slotInWeekFromDayNumber,
  groupDaysByWeek,
  WorkoutPlanLike,
  WorkoutPlanDay,
} from '../workout-plan-utils'

// ---------------------------------------------------------------------------
// DAY_NAME_TO_NUMBER
// ---------------------------------------------------------------------------

describe('DAY_NAME_TO_NUMBER', () => {
  it('maps all seven days correctly', () => {
    expect(DAY_NAME_TO_NUMBER.monday).toBe(1)
    expect(DAY_NAME_TO_NUMBER.tuesday).toBe(2)
    expect(DAY_NAME_TO_NUMBER.wednesday).toBe(3)
    expect(DAY_NAME_TO_NUMBER.thursday).toBe(4)
    expect(DAY_NAME_TO_NUMBER.friday).toBe(5)
    expect(DAY_NAME_TO_NUMBER.saturday).toBe(6)
    expect(DAY_NAME_TO_NUMBER.sunday).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// getWeekdayNumber
// ---------------------------------------------------------------------------

describe('getWeekdayNumber', () => {
  it('returns 7 for Sunday (JS day 0)', () => {
    const sunday = new Date('2026-06-14')  // known Sunday
    expect(getWeekdayNumber(sunday)).toBe(7)
  })

  it('returns 1 for Monday', () => {
    const monday = new Date('2026-06-15')
    expect(getWeekdayNumber(monday)).toBe(1)
  })

  it('returns 5 for Friday', () => {
    const friday = new Date('2026-06-19')
    expect(getWeekdayNumber(friday)).toBe(5)
  })

  it('returns value between 1 and 7', () => {
    const result = getWeekdayNumber(new Date())
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(7)
  })
})

// ---------------------------------------------------------------------------
// getPlanDayForWeekday
// ---------------------------------------------------------------------------

describe('getPlanDayForWeekday', () => {
  const plan: WorkoutPlanLike = {
    days: [
      { day_number: 1, name: 'Monday' },
      { day_number: 3, name: 'Wednesday' },
      { day_of_week: 'friday', name: 'Friday' },
    ],
  }

  it('returns null for null plan', () => {
    expect(getPlanDayForWeekday(null, 1)).toBeNull()
  })

  it('returns null for plan without days', () => {
    expect(getPlanDayForWeekday({ days: [] }, 1)).toBeNull()
  })

  it('finds day by day_number', () => {
    const day = getPlanDayForWeekday(plan, 1)
    expect(day?.name).toBe('Monday')
  })

  it('finds day by day_of_week string', () => {
    const day = getPlanDayForWeekday(plan, 5)  // friday = 5
    expect(day?.name).toBe('Friday')
  })

  it('returns null when weekday not in plan', () => {
    expect(getPlanDayForWeekday(plan, 2)).toBeNull()  // Tuesday not in plan
  })

  it('handles uppercase day_of_week', () => {
    const p: WorkoutPlanLike = { days: [{ day_of_week: 'MONDAY' }] }
    expect(getPlanDayForWeekday(p, 1)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Multi-week plan resolution
// ---------------------------------------------------------------------------

describe('multi-week plan resolution', () => {
  const multiWeekPlan: WorkoutPlanLike = {
    start_date: '2026-06-16', // Monday
    duration_weeks: 8,
    days: [
      { day_number: 1, name: 'W1 Mon', is_rest_day: false },
      { day_number: 3, name: 'W1 Wed', is_rest_day: false },
      { day_number: 8, name: 'W2 Mon', is_rest_day: false },
      { day_number: 10, name: 'W2 Wed', is_rest_day: false },
    ],
  }

  it('detects multi-week plans', () => {
    expect(isMultiWeekPlan(multiWeekPlan)).toBe(true)
    expect(isMultiWeekPlan({ days: [{ day_number: 1 }] })).toBe(false)
  })

  it('returns week 1 during the first calendar week after start_date', () => {
    expect(getProgramWeekForDate(multiWeekPlan, new Date('2026-06-18'))).toBe(1)
  })

  it('returns week 2 during the second calendar week', () => {
    expect(getProgramWeekForDate(multiWeekPlan, new Date('2026-06-23'))).toBe(2)
  })

  it('resolves week 1 Monday on activation week', () => {
    const day = getPlanDayForWeekday(multiWeekPlan, 1, new Date('2026-06-16'))
    expect(day?.name).toBe('W1 Mon')
  })

  it('resolves week 2 Monday after one full week', () => {
    const day = getPlanDayForWeekday(multiWeekPlan, 1, new Date('2026-06-23'))
    expect(day?.name).toBe('W2 Mon')
  })

  it('does not repeat week 1 on week 2 dates', () => {
    const week2Day = getPlanDayForWeekday(multiWeekPlan, 1, new Date('2026-06-23'))
    expect(week2Day?.name).not.toBe('W1 Mon')
  })

  it('returns null before program start', () => {
    expect(getPlanDayForWeekday(multiWeekPlan, 1, new Date('2026-06-10'))).toBeNull()
  })

  it('returns null after program duration ends', () => {
    expect(isProgramWeekInRange(multiWeekPlan, new Date('2026-08-18'))).toBe(false)
    expect(getPlanDayForDate(multiWeekPlan, new Date('2026-08-18'))).toBeNull()
    expect(isProgramCompleted(multiWeekPlan, new Date('2026-08-18'))).toBe(true)
  })

  it('reports lifecycle status across program window', () => {
    expect(getProgramLifecycleStatus(multiWeekPlan, new Date('2026-06-10'))).toBe('not_started')
    expect(getProgramLifecycleStatus(multiWeekPlan, new Date('2026-06-18'))).toBe('active')
    expect(getProgramLifecycleStatus(multiWeekPlan, new Date('2026-08-18'))).toBe('completed')
  })

  it('computes global day numbers', () => {
    expect(globalDayNumberForProgramWeek(2, 1)).toBe(8)
    expect(globalDayNumberForProgramWeek(2, 3)).toBe(10)
  })

  it('counts training days for the current program week only', () => {
    expect(getPlanTrainingWeekdays(multiWeekPlan, new Date('2026-06-18'))).toEqual([1, 3])
    expect(getPlanTrainingWeekdays(multiWeekPlan, new Date('2026-06-23'))).toEqual([1, 3])
  })

  it('derives duration from day numbers when duration_weeks is missing', () => {
    const plan: WorkoutPlanLike = {
      start_date: '2026-06-16',
      days: [{ day_number: 15, name: 'W3 Fri' }],
    }
    expect(planDurationWeeksFromPlan(plan)).toBe(3)
  })

  it('uses the greater of duration_weeks and weeks inferred from day_number', () => {
    const plan: WorkoutPlanLike = {
      duration_weeks: 4,
      start_date: '2026-05-20',
      days: [{ day_number: 40, name: 'W6' }],
    }
    expect(planDurationWeeksFromPlan(plan)).toBe(6)
  })

  it('getTodaysPlanDay uses week-aware lookup', () => {
    const day = getTodaysPlanDay(multiWeekPlan, new Date('2026-06-24'))
    expect(day?.name).toBe('W2 Wed')
  })

  it('continues week progression across calendar months', () => {
    const anchor = '2026-06-16'
    expect(getProgramWeekForAnchor(anchor, new Date('2026-06-30'), 8)).toBe(3)
    expect(getProgramWeekForAnchor(anchor, new Date('2026-07-07'), 8)).toBe(4)
    expect(getProgramWeekForAnchor(anchor, new Date('2026-07-07'), 8)).not.toBe(1)
  })
})

// ---------------------------------------------------------------------------
// getPlanTrainingWeekdays
// ---------------------------------------------------------------------------

describe('getPlanTrainingWeekdays', () => {
  it('returns empty array for null', () => {
    expect(getPlanTrainingWeekdays(null)).toEqual([])
  })

  it('excludes rest days', () => {
    const plan: WorkoutPlanLike = {
      days: [
        { day_number: 1, is_rest_day: false },
        { day_number: 2, is_rest_day: true },
        { day_number: 3, is_rest_day: false },
      ],
    }
    expect(getPlanTrainingWeekdays(plan)).toEqual([1, 3])
  })

  it('returns sorted weekday numbers', () => {
    const plan: WorkoutPlanLike = {
      days: [
        { day_number: 5, is_rest_day: false },
        { day_number: 1, is_rest_day: false },
      ],
    }
    expect(getPlanTrainingWeekdays(plan)).toEqual([1, 5])
  })

  it('handles day_of_week strings', () => {
    const plan: WorkoutPlanLike = {
      days: [{ day_of_week: 'wednesday', is_rest_day: false }],
    }
    expect(getPlanTrainingWeekdays(plan)).toEqual([3])
  })
})

// ---------------------------------------------------------------------------
// getPlanWeeklyGoal
// ---------------------------------------------------------------------------

describe('getPlanWeeklyGoal', () => {
  it('returns 0 for null plan', () => {
    expect(getPlanWeeklyGoal(null)).toBe(0)
  })

  it('counts non-rest days when days are available', () => {
    const plan: WorkoutPlanLike = {
      days: [
        { day_number: 1, is_rest_day: false },
        { day_number: 2, is_rest_day: true },
        { day_number: 3, is_rest_day: false },
      ],
    }
    expect(getPlanWeeklyGoal(plan)).toBe(2)
  })

  it('falls back to training_days when no days array', () => {
    expect(getPlanWeeklyGoal({ training_days: 4 })).toBe(4)
  })

  it('falls back to days_per_week when training_days is also absent', () => {
    expect(getPlanWeeklyGoal({ days_per_week: 5 })).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// isPlanTrainingWeekday
// ---------------------------------------------------------------------------

describe('isPlanTrainingWeekday', () => {
  const plan: WorkoutPlanLike = {
    days: [
      { day_number: 1, is_rest_day: false },
      { day_number: 7, is_rest_day: true },
    ],
  }

  it('returns true for training day', () => {
    expect(isPlanTrainingWeekday(plan, 1)).toBe(true)
  })

  it('returns false for rest day', () => {
    expect(isPlanTrainingWeekday(plan, 7)).toBe(false)
  })

  it('returns false for day not in plan', () => {
    expect(isPlanTrainingWeekday(plan, 4)).toBe(false)
  })

  it('returns false for null plan', () => {
    expect(isPlanTrainingWeekday(null, 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// weekNumberFromDayNumber / slotInWeekFromDayNumber
// ---------------------------------------------------------------------------

describe('weekNumberFromDayNumber', () => {
  it('days 1-7 are week 1', () => {
    for (let d = 1; d <= 7; d++) {
      expect(weekNumberFromDayNumber(d)).toBe(1)
    }
  })

  it('days 8-14 are week 2', () => {
    for (let d = 8; d <= 14; d++) {
      expect(weekNumberFromDayNumber(d)).toBe(2)
    }
  })

  it('day 0 returns 1 (minimum)', () => {
    expect(weekNumberFromDayNumber(0)).toBe(1)
  })
})

describe('slotInWeekFromDayNumber', () => {
  it('day 1 is slot 1', () => expect(slotInWeekFromDayNumber(1)).toBe(1))
  it('day 7 is slot 7', () => expect(slotInWeekFromDayNumber(7)).toBe(7))
  it('day 8 is slot 1 (second week)', () => expect(slotInWeekFromDayNumber(8)).toBe(1))
  it('day 14 is slot 7 (second week)', () => expect(slotInWeekFromDayNumber(14)).toBe(7))
})

// ---------------------------------------------------------------------------
// groupDaysByWeek
// ---------------------------------------------------------------------------

describe('groupDaysByWeek', () => {
  it('groups days correctly into weeks', () => {
    const days = [
      { day_number: 1 },
      { day_number: 3 },
      { day_number: 8 },
      { day_number: 10 },
    ]
    const result = groupDaysByWeek(days)
    expect(result).toHaveLength(2)
    expect(result[0].weekIndex).toBe(0)  // week 1 = index 0
    expect(result[0].days).toHaveLength(2)
    expect(result[1].weekIndex).toBe(1)
    expect(result[1].days).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(groupDaysByWeek([])).toEqual([])
  })

  it('sorts days within each week by day_number', () => {
    const days = [{ day_number: 5 }, { day_number: 2 }, { day_number: 1 }]
    const result = groupDaysByWeek(days)
    const weekDays = result[0].days
    expect(weekDays[0].day_number).toBe(1)
    expect(weekDays[1].day_number).toBe(2)
    expect(weekDays[2].day_number).toBe(5)
  })
})
