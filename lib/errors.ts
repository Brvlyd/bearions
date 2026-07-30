// Caught values are `unknown` in TypeScript: anything can be thrown, not just
// Error. These helpers read a message safely so call sites can stay typed
// instead of falling back to `any`.

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }

  if (typeof error === 'string') return error

  return ''
}

/** Message if there is one, otherwise the supplied fallback. */
export function getErrorMessageOr(error: unknown, fallback: string): string {
  return getErrorMessage(error) || fallback
}
