const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is required. Set it to the Tracker web origin.'
  )
}

export const config = { apiUrl: apiUrl.replace(/\/$/, '') } as const