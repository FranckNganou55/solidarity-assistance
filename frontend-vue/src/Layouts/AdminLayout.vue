<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { api, assetUrl, DEFAULT_GROUP_LOGO, messageOf } from '../Services/api'
import { useAppStore } from '../Stores/app'
import { useT } from '../Services/i18n'
import AppNavbar from '../Components/Navigation/AppNavbar.vue'
import SidebarNavigation from '../Components/Navigation/SidebarNavigation.vue'

const app=useAppStore(),route=useRoute(),router=useRouter(),t=useT()
const langMenu=ref(false),themeMenu=ref(false),notifOpen=ref(false),notifications=ref([]),unread=ref(0),mobileOpen=ref(false),loading=ref(false)
let notificationTimer=null, soundContext=null, previousUnread=null
const activeGroup=computed(()=>app.groups.find(g=>g.id===app.activeGroupId))
const items=computed(()=>[
  {section:'overview',links:[['home','⌂','/'],['myStats','▥','/myStats'],['assistances','♡','/assistances','EVENT_VIEW'],['events','▣','/events','EVENT_VIEW'],['contributions','↗','/contributions','CONTRIBUTION_VIEW'],['requests','▤','/requests','REQUEST_CREATE']]},
  {section:'management',links:[['members','♙','/members','MEMBER_VIEW'],['types','◇','/types','ASSISTANCE_TYPE_VIEW'],['audit','◷','/audit','AUDIT_VIEW']]},
  {section:'administration',links:[['board','♙','/board','MEMBER_EDIT'],['roles','♧','/roles','ROLE_VIEW'],['assignments','⇄','/assignments','ROLE_ASSIGN'],...(app.member?.superAdmin?[['groups','▦','/groups']]:[])]}
].map(section=>({...section,links:section.links.filter(link=>!link[3]||app.can(link[3]))})).filter(s=>s.links.length))
const pageTitle=computed(()=>t(route.meta.page||'home'))
async function openNotifications(){notifOpen.value=!notifOpen.value;if(notifOpen.value){try{const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass){soundContext??=new AudioContextClass();if(soundContext.state==='suspended')await soundContext.resume()}}catch{}await refreshNotifications()}}
async function unlockAudio(){try{const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass){soundContext??=new AudioContextClass();if(soundContext.state==='suspended')await soundContext.resume()}}catch{}}
function playNotificationSound(){if(!soundContext||soundContext.state!=='running')return;try{const osc=soundContext.createOscillator(),gain=soundContext.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.setValueAtTime(.0001,soundContext.currentTime);gain.gain.exponentialRampToValueAtTime(.12,soundContext.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,soundContext.currentTime+.28);osc.connect(gain);gain.connect(soundContext.destination);osc.start();osc.stop(soundContext.currentTime+.3)}catch{}}
async function refreshNotifications(){try{const {data}=await api.get('/notifications');notifications.value=data.notifications||[];unread.value=data.unreadCount||0}catch{}}
function notificationText(n,part){const keys={CONTRIBUTION_SUBMITTED:part==='title'?'notifContributionSubmittedTitle':'notifContributionSubmittedMessage',CONTRIBUTION_VALIDATED:part==='title'?'notifContributionValidatedTitle':'notifContributionValidatedMessage',CONTRIBUTION_INVALIDATED:part==='title'?'notifContributionInvalidatedTitle':'notifContributionInvalidatedMessage'};const key=keys[n.type];return key?t(key):(part==='title'?n.title:n.message)}
async function markAll(){await api.post('/notifications/read-all');await refreshNotifications()}
async function selectGroup(e){const id=Number(e.target.value);try{loading.value=true;await app.setGroup(id);await refreshNotifications()}catch(err){app.notify(messageOf(err),'error')}finally{loading.value=false}}
async function logout(){await app.logout();router.replace('/login')}
function toggleLang(){app.setLang(app.lang==='fr'?'en':'fr')}
onMounted(async()=>{document.documentElement.dataset.theme=app.theme;document.documentElement.lang=app.lang;document.addEventListener('pointerdown',unlockAudio,{once:true});if(app.token){try{loading.value=true;await app.refreshGroups();await refreshNotifications();previousUnread=unread.value;notificationTimer=window.setInterval(async()=>{await refreshNotifications();if(previousUnread!==null&&unread.value>previousUnread)playNotificationSound();previousUnread=unread.value},30000)}catch(err){app.notify(messageOf(err),'error')}finally{loading.value=false}}})
onUnmounted(()=>{document.removeEventListener('pointerdown',unlockAudio);if(notificationTimer)window.clearInterval(notificationTimer);if(soundContext)soundContext.close()})
watch(()=>app.lang,()=>{document.documentElement.lang=app.lang;refreshNotifications()})
watch(()=>app.theme,value=>document.documentElement.dataset.theme=value)
</script>

<template>
  <div class="app-shell" :class="{'mobile-nav-open':mobileOpen}">
    <div class="mobile-scrim" @click="mobileOpen=false"></div>
    <aside class="sidebar">
      <div class="brand"><img :src="assetUrl(activeGroup?.logoUrl||app.settings?.logoUrl)||DEFAULT_GROUP_LOGO" alt="Logo Makénéné Solidarité" @error="$event.target.src=DEFAULT_GROUP_LOGO"><div><strong>{{activeGroup?.name||app.settings?.orgName||'Makénéné Solidarité'}}</strong><small>{{t('workspace')}}</small></div></div>
      <nav>
        <SidebarNavigation :sections="items" :translate="t" @navigate="mobileOpen=false" />
        <section class="nav-section nav-bottom"><RouterLink v-if="app.can('SETTINGS_VIEW')" to="/settings" class="nav-link"><span>⚙</span>{{t('settings')}}</RouterLink><RouterLink to="/profile" class="nav-link"><span>◎</span>{{t('profile')}}</RouterLink></section>
      </nav>
      <div class="side-account"><div class="avatar"><img v-if="app.member?.photoUrl" :src="assetUrl(app.member.photoUrl)" :alt="app.member.fullName" @error="$event.target.hidden=true"> <template v-else>{{app.member?.firstName?.[0]}}{{app.member?.lastName?.[0]}}</template></div><div class="account-copy"><strong>{{app.member?.fullName}}</strong><small>{{app.member?.superAdmin?t('systemAdmin'):app.member?.groupAdmin?t('principalAdmin'):app.member?.roleName}} · {{app.member?.phone}}</small></div><button class="icon-button logout" :title="t('logout')" @click="logout">↪</button></div>
    </aside>
    <div class="main-column">
      <AppNavbar><button class="icon-button hamburger" @click="mobileOpen=true">☰</button><div class="top-title"><strong>{{pageTitle}}</strong><small>{{activeGroup?.name}}</small></div><div class="top-actions">
        <label v-if="app.groups.length>1" class="group-picker"><img :src="assetUrl(activeGroup?.logoUrl||app.settings?.logoUrl)||DEFAULT_GROUP_LOGO" alt="" @error="$event.target.src=DEFAULT_GROUP_LOGO"><span><small>{{t('activeGroup')}}</small><strong>{{activeGroup?.name}}</strong></span><select :value="app.activeGroupId" aria-label="Association" @change="selectGroup"><option v-for="g in app.groups" :key="g.id" :value="g.id">{{g.name}}</option></select><b>⌄</b></label>
        <span v-else-if="activeGroup" class="group-static"><img :src="assetUrl(activeGroup.logoUrl||app.settings?.logoUrl)||DEFAULT_GROUP_LOGO" :alt="`Logo ${activeGroup.name}`" @error="$event.target.src=DEFAULT_GROUP_LOGO">{{activeGroup.name}}</span>
        <div class="action-wrap"><button class="icon-button notification-button" :title="t('notifications')" @click="openNotifications">🔔<i v-if="unread">{{unread>99?'99+':unread}}</i></button><div v-if="notifOpen" class="notification-popover"><div class="popover-heading"><strong>{{t('notifications')}}</strong><button v-if="unread" class="text-button" @click="markAll">{{t('markAll')}}</button></div><p v-if="!notifications.length" class="empty-inline">{{t('noNotifications')}}</p><button v-for="n in notifications" :key="n.id" class="notification-row" @click="api.post(`/notifications/${n.id}/read`).then(refreshNotifications)"><strong>{{notificationText(n,'title')}}</strong><span>{{notificationText(n,'message')}}</span></button></div></div>
        <button class="icon-button lang-toggle" @click="toggleLang">{{app.lang.toUpperCase()}}</button>
        <button class="icon-button" :title="t('theme')" @click="app.setTheme(app.theme==='light'?'dark':'light')">{{app.theme==='light'?'☼':'☾'}}</button>
        <RouterLink to="/profile" class="avatar avatar-top"><img v-if="app.member?.photoUrl" :src="assetUrl(app.member.photoUrl)" :alt="app.member.fullName" @error="$event.target.hidden=true"> <template v-else>{{app.member?.firstName?.[0]}}{{app.member?.lastName?.[0]}}</template></RouterLink>
      </div></AppNavbar>
      <main class="content"><div v-if="loading" class="global-loading"><span class="spinner"></span>{{t('loading')}}</div><RouterView v-else v-slot="{Component}"><component :is="Component" :key="route.fullPath" /></RouterView></main>
    </div>
    <Transition><div v-if="app.toast" class="toast" :class="app.toast.kind">{{app.toast.message}}</div></Transition>
  </div>
</template>
