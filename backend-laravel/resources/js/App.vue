<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AdminLayout from './Layouts/AdminLayout.vue'

const route = useRoute()
const isLogin = computed(() => route.path === '/login')
</script>

<template>
  <RouterView v-if="isLogin" />
  <AdminLayout v-else />
</template>
