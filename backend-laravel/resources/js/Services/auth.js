import { api } from './api'

export const signIn = (identifier, password, groupId) =>
  api.post('/auth/login', { phone: identifier, password, groupId })

export const signOut = () => api.post('/auth/logout')
