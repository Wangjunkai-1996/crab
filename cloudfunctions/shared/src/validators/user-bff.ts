import { validatePreferredView } from './common'

export function validateSetPreferredViewPayload(payload: Record<string, unknown>) {
  return {
    preferredView: validatePreferredView(payload.preferredView),
  }
}

