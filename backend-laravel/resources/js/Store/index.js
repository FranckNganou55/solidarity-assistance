import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../Services/api'
import { signIn, signOut } from '../Services/auth'

export const useAppStore = defineStore('app', () => {
  const token=ref(localStorage.getItem('ms.token')||'')
  const member=ref(JSON.parse(localStorage.getItem('ms.member')||'null'))
  const groups=ref([])
  const activeGroupId=ref(Number(localStorage.getItem('ms.group'))||null)
  const lang=ref(localStorage.getItem('ms.lang')||'fr')
  const theme=ref(localStorage.getItem('ms.theme')||'light')
  const settings=ref(null)
  const toast=ref(null)
  let toastTimer
  function notify(message,kind='info') { toast.value={message,kind}; clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.value=null,4000) }
  async function refreshGroups() {
    const {data}=await api.get('/groups');groups.value=data
    if (!groups.value.some(g=>g.id===activeGroupId.value)) activeGroupId.value=groups.value[0]?.id||null
    if(activeGroupId.value)localStorage.setItem('ms.group',String(activeGroupId.value))
    await refreshContext()
  }
  async function refreshContext() {
    if(!token.value)return
    const [m,s]=await Promise.all([api.get('/auth/me'),api.get('/public/settings',{params:{groupId:activeGroupId.value}})]);member.value=m.data;settings.value=s.data
    if(!localStorage.getItem('ms.lang')&&settings.value.defaultLocale){lang.value=settings.value.defaultLocale;localStorage.setItem('ms.lang',lang.value)}
    if(!localStorage.getItem('ms.theme')&&settings.value.defaultTheme&&settings.value.defaultTheme!=='system'){setTheme(settings.value.defaultTheme)}
    localStorage.setItem('ms.member',JSON.stringify(member.value))
  }
  async function login(identifier,password,groupId) {
    const {data}=await signIn(identifier,password,groupId);token.value=data.token;member.value=data.member
    activeGroupId.value=Number(data.member?.groupId||groupId)||null
    localStorage.setItem('ms.token',data.token);localStorage.setItem('ms.member',JSON.stringify(data.member))
    if(activeGroupId.value)localStorage.setItem('ms.group',String(activeGroupId.value))
    await refreshGroups();return data
  }
  async function logout() { try { await signOut() } catch{};token.value='';member.value=null;groups.value=[];localStorage.removeItem('ms.token');localStorage.removeItem('ms.member');localStorage.removeItem('ms.group') }
  async function setGroup(id) { activeGroupId.value=id;localStorage.setItem('ms.group',String(id));await refreshContext() }
  function setLang(value) { lang.value=value;localStorage.setItem('ms.lang',value) }
  function setTheme(value) { theme.value=value;localStorage.setItem('ms.theme',value);document.documentElement.dataset.theme=value }
  function can(permission) { return !!(member.value?.superAdmin || member.value?.permissions?.includes(permission)) }
  return {token,member,groups,activeGroupId,lang,theme,settings,toast,notify,refreshGroups,refreshContext,login,logout,setGroup,setLang,setTheme,can}
})
