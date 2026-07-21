import { buildComparisonsByType, buildDayPackages } from "../progress-photo-compare"

describe("progress-photo-compare", () => {
  it("never mixes poses in first/last comparison", () => {
    const photos = [
      { id: "1", date: "2026-01-01", photo_url: "/a.jpg", photo_type: "back" },
      { id: "2", date: "2026-01-01", photo_url: "/b.jpg", photo_type: "front" },
      { id: "3", date: "2026-02-01", photo_url: "/c.jpg", photo_type: "front" },
      { id: "4", date: "2026-02-01", photo_url: "/d.jpg", photo_type: "left_side" },
    ]
    const comparisons = buildComparisonsByType(photos)
    const front = comparisons.find((c) => c.type === "front")
    const back = comparisons.find((c) => c.type === "back")
    const left = comparisons.find((c) => c.type === "left_side")
    const right = comparisons.find((c) => c.type === "right_side")

    expect(front?.first?.id).toBe("2")
    expect(front?.last?.id).toBe("3")
    expect(back?.first?.id).toBe("1")
    expect(back?.last?.id).toBe("1")
    expect(left?.first?.id).toBe("4")
    expect(right?.first).toBeNull()
    expect(right?.last).toBeNull()
  })

  it("groups by date with weight and empty pose slots", () => {
    const packages = buildDayPackages(
      [
        { id: "1", date: "2026-03-01", photo_url: "/a.jpg", photo_type: "front", weight: 70 },
        { id: "2", date: "2026-03-01", photo_url: "/b.jpg", photo_type: "side" },
      ],
      { "2026-03-01": 71 },
    )
    expect(packages).toHaveLength(1)
    expect(packages[0].weight).toBe(71)
    expect(packages[0].photosByType.front?.id).toBe("1")
    expect(packages[0].photosByType.back).toBeNull()
    expect(packages[0].unclassified).toHaveLength(1)
  })
})
