import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api', timeout: 20000 })

/** Resolve uploaded assets through the same API host while keeping local paths valid. */
export function assetUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  const configuredBase = import.meta.env.VITE_API_BASE || '/api'
  if (/^https?:\/\//i.test(configuredBase)) {
    try { return new URL(normalized, configuredBase).toString() } catch { return normalized }
  }
  return normalized
}

export const DEFAULT_GROUP_LOGO = '/logo-fm-mak.jpeg'
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ms.token')
  const group = localStorage.getItem('ms.group')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (group) config.headers['X-Group-Id'] = group
  config.headers['Accept-Language'] = localStorage.getItem('ms.lang') || 'fr'
  return config
})
api.interceptors.response.use(r => r, error => {
  if (error.response?.status === 401 && localStorage.getItem('ms.token')) {
    localStorage.removeItem('ms.token'); localStorage.removeItem('ms.member')
    window.location.assign('/login')
  }
  return Promise.reject(error)
})

export const messageOf = error => {
  const status=error?.response?.status,lang=localStorage.getItem('ms.lang')||'fr'
  if(error?.code==='ECONNABORTED'||/timeout/i.test(error?.message||''))return lang==='en'?'The server took too long to respond. Check whether the member was created before submitting again.':'Le serveur a mis trop de temps à répondre. Vérifiez si le membre a été créé avant de renvoyer le formulaire.'
  const messages={
    fr:{400:'La demande ne peut pas être traitée.',401:'Votre session a expiré. Reconnectez-vous.',403:'Vous n’avez pas les droits nécessaires.',404:'Élément introuvable.',409:'Cette action entre en conflit avec les données existantes.',422:'Vérifiez les champs renseignés.',500:'Une erreur interne est survenue.'},
    en:{400:'The request could not be processed.',401:'Your session expired. Please sign in again.',403:'You do not have permission to do this.',404:'The requested item was not found.',409:'This action conflicts with existing data.',422:'Please check the information you entered.',500:'An internal error occurred.'},
  }
  if(status&&messages[lang]?.[status])return messages[lang][status]
  return error?.response?.data?.message || error?.message || (lang==='en'?'An error occurred.':'Une erreur est survenue.')
}
