const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : 'http://localhost:3000')

export const config = { apiUrl: apiUrl.replace(/\/$/, '') } as const