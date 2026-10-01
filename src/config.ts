const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : undefined)

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is required. Set it to the Tracker web origin.'
  )
}

export const config = { apiUrl: apiUrl.replace(/\/$/, '') } as const