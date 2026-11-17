<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api, assetUrl, DEFAULT_GROUP_LOGO, messageOf } from '../Services/api'
import { useAppStore } from '../Store/index.js'
import { useT } from '../Services/i18n'
import PwaInstallButton from '../Components/ui/PwaInstallButton.vue'

const app = useAppStore()
const t = useT()
const groups = ref([])
const search = ref('')
const loading = ref(true)
const error = ref('')
const filteredGroups = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return groups.value
  return groups.value.filter(group => `${group.name} ${group.city || ''} ${group.description || ''}`.toLocaleLowerCase().includes(query))
})

onMounted(async () => {
  document.documentElement.dataset.theme = app.theme
  document.documentElement.lang = app.lang
  try {
    const { data } = await api.get('/public/groups')
    groups.value = data
  } catch (exception) {
    error.value = messageOf(exception)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="public-home">
    <header class="public-nav">
      <RouterLink class="public-brand" to="/" aria-label="Makénéné Solidarité">
        <img :src="DEFAULT_GROUP_LOGO" alt="Logo Makénéné Solidarité">
        <span><strong>Makénéné Solidarité</strong><small>{{ t('workspace') }}</small></span>
      </RouterLink>
      <nav class="public-links" :aria-label="t('publicNavigation')">
        <a href="#accueil">{{ t('home') }}</a>
        <a href="#groupes">{{ t('groups') }}</a>
        <RouterLink to="/login">{{ t('signIn') }}</RouterLink>
      </nav>
      <div class="public-tools">
        <button type="button" class="public-lang" @click="app.setLang(app.lang === 'fr' ? 'en' : 'fr')">{{ app.lang === 'fr' ? 'EN' : 'FR' }}</button>
        <PwaInstallButton />
        <RouterLink class="public-login" to="/login">{{ t('signIn') }} <span aria-hidden="true">→</span></RouterLink>
      </div>
    </header>

    <section id="accueil" class="public-hero">
      <div class="hero-copy">
        <p class="hero-kicker">{{ t('publicEyebrow') }}</p>
        <h1>{{ t('publicHeadline') }}</h1>
        <p class="hero-description">{{ t('publicDescription') }}</p>
        <a class="hero-cta" href="#groupes">{{ t('discoverGroups') }} <span aria-hidden="true">→</span></a>
        <div class="hero-points"><span>✓ {{ t('publicPointOne') }}</span><span>✓ {{ t('publicPointTwo') }}</span><span>✓ {{ t('publicPointThree') }}</span></div>
      </div>
    </section>

    <section id="groupes" class="public-groups">
      <div class="groups-heading">
        <div><p class="section-kicker">{{ t('publicGroupKicker') }}</p><h2>{{ t('chooseGroup') }}</h2><p>{{ t('publicGroupDescription') }}</p></div>
        <span class="group-count">{{ filteredGroups.length }} {{ t('groupsFound') }}</span>
      </div>

      <label class="group-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" :placeholder="t('searchGroup')"></label>

      <div v-if="loading" class="public-state" role="status">{{ t('loadingGroups') }}</div>
      <div v-else-if="error" class="public-state public-error" role="alert">{{ error }}</div>
      <div v-else-if="!filteredGroups.length" class="public-state">{{ groups.length ? t('noGroupsMatch') : t('noPublicGroups') }}</div>
      <div v-else class="group-grid">
        <article v-for="group in filteredGroups" :key="group.id" class="public-group-card">
          <div class="group-cover"><img :src="assetUrl(group.logoUrl) || DEFAULT_GROUP_LOGO" :alt="`Logo ${group.name}`" @error="$event.target.src = DEFAULT_GROUP_LOGO"><span>{{ t('association') }}</span></div>
          <div class="group-card-body">
            <h3>{{ group.name }}</h3>
            <p v-if="group.city" class="group-city"><span aria-hidden="true">⌖</span>{{ group.city }}</p>
            <p v-if="group.description" class="group-description">{{ group.description }}</p>
            <RouterLink class="group-enter" :to="{ name: 'login', query: { group: group.id } }">{{ t('enterGroup') }} <span aria-hidden="true">→</span></RouterLink>
          </div>
        </article>
      </div>
    </section>

    <footer class="public-footer">
      <div class="footer-about"><div class="footer-brand"><img :src="DEFAULT_GROUP_LOGO" alt=""><strong>Makénéné Solidarité</strong></div><p>{{ t('publicFooterDescription') }}</p></div>
      <div><h3>{{ t('groups') }}</h3><a href="#groupes">{{ t('discoverGroups') }}</a><RouterLink to="/login">{{ t('signIn') }}</RouterLink></div>
      <div><h3>{{ t('publicTrust') }}</h3><p>✓ {{ t('publicSecureAccounts') }}</p><p>✓ {{ t('publicGroupPrivacy') }}</p></div>
      <small class="footer-copyright">© {{ new Date().getFullYear() }} Makénéné Solidarité</small>
    </footer>
  </main>
</template>

<style scoped>
.public-home{min-height:100vh;background:#f7f9f6;color:#15293d;font-family:Inter,Poppins,Arial,sans-serif}.public-nav{height:88px;padding:0 clamp(24px,7vw,136px);display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border-bottom:1px solid #e7ece9;position:sticky;top:0;z-index:10}.public-brand,.footer-brand{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none}.public-brand img{width:52px;height:52px;object-fit:cover;border-radius:14px}.public-brand span,.public-brand small{display:block}.public-brand strong{font-size:17px}.public-brand small{font-size:12px;color:#718096;margin-top:3px}.public-links,.public-tools{display:flex;align-items:center;gap:clamp(18px,3.5vw,54px)}.public-links a,.public-footer a{color:#28394b;text-decoration:none;font-weight:650}.public-links a:hover,.public-footer a:hover{color:#1e6f5c}.public-tools{gap:12px}.public-lang,.public-login,.hero-cta{border:0;border-radius:999px;min-height:48px;padding:0 22px;display:inline-flex;align-items:center;justify-content:center;gap:18px;text-decoration:none;font-weight:750;cursor:pointer}.public-lang{background:#edf4f1;color:#1e6f5c}.public-login{background:#1e6f5c;color:#fff;box-shadow:0 9px 22px #1e6f5c2b;transition:transform .2s,box-shadow .2s}.public-login:hover,.hero-cta:hover,.group-enter:hover{transform:translateY(-2px)}.public-hero{min-height:535px;padding:72px clamp(24px,11.5vw,220px);display:flex;align-items:center;justify-content:space-between;gap:50px;position:relative;overflow:hidden;background:linear-gradient(105deg,rgba(9,32,41,.92) 0%,rgba(14,48,53,.76) 50%,rgba(30,111,92,.46) 100%),url('/solidarity-community-hero.png') center/cover no-repeat;color:#fff}.public-hero:after{content:'';position:absolute;width:450px;height:450px;border:1px solid #ffffff20;border-radius:50%;right:8%;top:10%;box-shadow:0 0 0 55px #ffffff08,0 0 0 110px #ffffff05;pointer-events:none}.hero-copy{position:relative;z-index:1;max-width:720px}.hero-kicker,.section-kicker{margin:0 0 22px;color:#65d2b3;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero-copy h1{margin:0;font-size:clamp(42px,6vw,76px);letter-spacing:-.055em;line-height:1.02;max-width:740px}.hero-description{max-width:590px;margin:26px 0 30px;font-size:clamp(16px,1.5vw,20px);line-height:1.7;color:#e3eeeb}.hero-cta{background:#ffc928;color:#122b39;min-height:54px;transition:transform .2s}.hero-points{display:flex;flex-wrap:wrap;gap:22px;margin-top:36px;font-size:13px;font-weight:650;color:#edf7f5}.hero-emblem{position:relative;z-index:1;width:min(26vw,300px);aspect-ratio:1;flex:none;padding:10px;border-radius:36% 64% 52% 48%/45% 40% 60% 55%;background:#ffffff22;transform:rotate(4deg);box-shadow:0 24px 80px #081f2280}.hero-emblem img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.public-groups{padding:76px clamp(24px,8vw,156px) 96px;max-width:1800px;margin:auto}.groups-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:28px}.section-kicker{margin-bottom:14px;color:#1e8b70}.groups-heading h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.04em;margin:0}.groups-heading p:not(.section-kicker){margin:12px 0 0;color:#718096}.group-count{flex:none;background:#e4f5f0;color:#11735e;border-radius:999px;padding:12px 18px;font-size:13px;font-weight:750}.group-search{display:flex;align-items:center;gap:12px;min-height:54px;padding:0 18px;margin-bottom:26px;border:1px solid #dce5e1;border-radius:13px;background:#fff;color:#788895}.group-search span{font-size:26px}.group-search input{width:100%;border:0;outline:0;background:transparent;color:#203547;font:inherit}.group-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.public-group-card{overflow:hidden;background:#fff;border:1px solid #e3e9e6;border-radius:20px;box-shadow:0 12px 34px #0c25200b;transition:transform .22s,box-shadow .22s}.public-group-card:hover{transform:translateY(-5px);box-shadow:0 20px 42px #0c252018}.group-cover{height:188px;position:relative;overflow:hidden;background:linear-gradient(135deg,#e4f3ef,#edf2f8);display:grid;place-items:center}.group-cover img{width:100%;height:100%;object-fit:cover}.group-cover span{position:absolute;left:16px;bottom:15px;padding:8px 12px;background:#fff;color:#1f3948;border-radius:999px;font-size:11px;font-weight:750}.group-card-body{padding:22px}.group-card-body h3{margin:0;font-size:21px;line-height:1.3}.group-city{color:#77879a;display:flex;align-items:center;gap:7px;margin:12px 0}.group-city span{color:#e7458c;font-size:20px}.group-description{min-height:44px;color:#667789;font-size:14px;line-height:1.55}.group-enter{margin-top:16px;display:flex;justify-content:space-between;align-items:center;padding:15px 17px;border-radius:11px;background:#1e6f5c;color:white;text-decoration:none;font-size:14px;font-weight:750;transition:transform .2s,background .2s}.group-enter:hover{background:#175c4c}.public-state{padding:44px 24px;background:#fff;border:1px solid #e5ebe8;border-radius:16px;text-align:center;color:#607180}.public-error{color:#b42318}.public-footer{display:grid;grid-template-columns:2fr 1fr 1.3fr;gap:40px;padding:56px clamp(24px,8vw,156px) 30px;background:#0f2230;color:#e5eff4}.public-footer h3{margin:0 0 18px;color:#fff;font-size:16px}.public-footer a,.public-footer p{display:block;margin:0 0 12px;color:#c3d4df;font-size:14px;line-height:1.65;text-decoration:none}.footer-brand{color:#fff}.footer-brand img{width:42px;height:42px;object-fit:cover;border-radius:12px}.footer-about>p{max-width:380px;margin-top:18px}.footer-copyright{grid-column:1/-1;padding-top:20px;border-top:1px solid #ffffff20;color:#9fb3c0}@media(max-width:900px){.public-links{gap:18px}.hero-emblem{width:220px}.group-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.public-hero{padding-left:7vw;padding-right:7vw}}@media(max-width:640px){.public-nav{height:74px;padding:0 18px}.public-brand img{width:44px;height:44px}.public-brand strong{font-size:14px}.public-links{display:none}.public-tools{gap:8px}.public-lang,.public-login{min-height:42px;padding:0 14px;font-size:12px}.public-hero{min-height:520px;padding:66px 24px;align-items:flex-start}.hero-copy h1{font-size:46px}.hero-emblem{position:absolute;width:148px;right:-20px;bottom:28px;opacity:.42}.hero-points{gap:12px;max-width:280px}.public-groups{padding:56px 18px 68px}.groups-heading{align-items:flex-start;flex-direction:column}.group-count{align-self:flex-start}.group-grid{grid-template-columns:1fr}.group-cover{height:190px}.public-footer{grid-template-columns:1fr;padding:42px 22px 24px;gap:24px}.footer-copyright{grid-column:auto}}@media(prefers-reduced-motion:reduce){.public-group-card,.public-login,.hero-cta,.group-enter{transition:none}}
</style>
