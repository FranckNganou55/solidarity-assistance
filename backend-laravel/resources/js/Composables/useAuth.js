import { computed } from 'vue'
import { useAppStore } from '../Store/index.js'

export function useAuth() {
  const store = useAppStore()

  return {
    isAuthenticated: computed(() => Boolean(store.token)),
    member: computed(() => store.member),
    login: (identifier, password, groupId) => store.login(identifier, password, groupId),
    logout: () => store.logout(),
  }
}
