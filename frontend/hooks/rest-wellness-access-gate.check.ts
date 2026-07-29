/**
 * Runnable self-check: npx --yes tsx frontend/hooks/rest-wellness-access-gate.check.ts
 */
import { shouldQueryRestWellnessAccess } from "./rest-wellness-access-gate"

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(!shouldQueryRestWellnessAccess(true, false), "skip while auth loading")
assert(!shouldQueryRestWellnessAccess(true, true), "skip while auth loading even if flag true")
assert(!shouldQueryRestWellnessAccess(false, false), "skip when logged out")
assert(shouldQueryRestWellnessAccess(false, true), "query when session ready")

console.log("rest-wellness-access-gate.check: ok")
