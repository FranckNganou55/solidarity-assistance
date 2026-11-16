import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './Pages/Auth/LoginPage.vue'
import HomePage from './Pages/Dashboard/HomePage.vue'
import MyStatisticsPage from './Pages/Dashboard/MyStatisticsPage.vue'
import AssistancesPage from './Pages/Assistances/AssistancesPage.vue'
import EventsPage from './Pages/Events/EventsPage.vue'
import EventDetailsPage from './Pages/Events/EventDetailsPage.vue'
import ContributionsPage from './Pages/Contributions/ContributionsPage.vue'
import RequestsPage from './Pages/Requests/RequestsPage.vue'
import MembersPage from './Pages/Members/MembersPage.vue'
import BoardMembersPage from './Pages/Administration/BoardMembersPage.vue'
import AssistanceTypesPage from './Pages/Administration/AssistanceTypesPage.vue'
import AuditLogPage from './Pages/Administration/AuditLogPage.vue'
import RolesPage from './Pages/Administration/RolesPage.vue'
import RoleAssignmentsPage from './Pages/Administration/RoleAssignmentsPage.vue'
import GroupsPage from './Pages/Administration/GroupsPage.vue'
import SettingsPage from './Pages/Settings/SettingsPage.vue'
import ProfilePage from './Pages/Profile/ProfilePage.vue'
import { useAppStore } from './Stores/app'

const routes = [
  { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
  { path: '/', name: 'home', component: HomePage, meta: { page: 'home' } },
  { path: '/myStats', name: 'myStats', component: MyStatisticsPage, meta: { page: 'myStats' } },
  { path: '/assistances', name: 'assistances', component: AssistancesPage, meta: { page: 'assistances' } },
  { path: '/events', name: 'events', component: EventsPage, meta: { page: 'events' } },
  { path: '/events/:id', name: 'eventDetails', component: EventDetailsPage, meta: { page: 'events' } },
  { path: '/contributions', name: 'contributions', component: ContributionsPage, meta: { page: 'contributions' } },
  { path: '/requests', name: 'requests', component: RequestsPage, meta: { page: 'requests' } },
  { path: '/members', name: 'members', component: MembersPage, meta: { page: 'members' } },
  { path: '/board', name: 'board', component: BoardMembersPage, meta: { page: 'board' } },
  { path: '/types', name: 'types', component: AssistanceTypesPage, meta: { page: 'types' } },
  { path: '/audit', name: 'audit', component: AuditLogPage, meta: { page: 'audit' } },
  { path: '/roles', name: 'roles', component: RolesPage, meta: { page: 'roles' } },
  { path: '/assignments', name: 'assignments', component: RoleAssignmentsPage, meta: { page: 'assignments' } },
  { path: '/groups', name: 'groups', component: GroupsPage, meta: { page: 'groups' } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { page: 'settings' } },
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { page: 'profile' } },
  { path: '/:pathMatch(.*)*', redirect: () => localStorage.getItem('ms.token') ? '/' : '/login' },
]

const router = createRouter({ history: createWebHistory(), routes })
router.beforeEach(to => {
  const store = useAppStore()
  if (!to.meta.public && !store.token) return '/login'
  if (to.path === '/login' && store.token) return store.member?.mustChangePassword ? '/profile?changePassword=1' : '/'
  if (store.token && store.member?.mustChangePassword && to.path !== '/profile') return '/profile?changePassword=1'
})

export default router
