import { api } from './api'

export const signIn = (identifier, password) =>
  api.post('/auth/login', { phone: identifier, password })

export const signOut = () => api.post('/auth/logout')
