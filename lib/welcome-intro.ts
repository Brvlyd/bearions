/**
 * Storage keys behind the landing page's welcome animation.
 *
 * The login form and the modal live on opposite sides of a full page load, so
 * the handoff between them has to survive that navigation — hence storage
 * rather than component state. Every access is guarded because storage throws
 * outright in some privacy modes, and a signed-in customer must never be left
 * stranded on the login page over a greeting.
 */

/** Set once the modal has been shown, so casual visitors only ever get it once. */
const SEEN_KEY = 'bearion_welcome_seen'

/** One-shot signal from a successful customer login. */
const AFTER_LOGIN_KEY = 'bearion_welcome_after_login'

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null
  } catch {
    return false
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Nothing to recover: worst case the modal greets them again next visit.
  }
}

/** Session-scoped, so the greeting belongs to this sign-in and not to a later tab. */
export function markWelcomeAfterLogin(): void {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, '1')
  } catch {
    // Losing the flag only costs the animation, so the redirect still proceeds.
  }
}

/** Reads and clears the flag — the greeting fires once per sign-in, not on every reload. */
export function consumeWelcomeAfterLogin(): boolean {
  try {
    const pending = sessionStorage.getItem(AFTER_LOGIN_KEY) !== null
    if (pending) sessionStorage.removeItem(AFTER_LOGIN_KEY)
    return pending
  } catch {
    return false
  }
}
