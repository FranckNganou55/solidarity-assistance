<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AdminLayout from './Layouts/AdminLayout.vue'

const route = useRoute()
const isPublic = computed(() => Boolean(route.meta.public))
</script>

<template>
  <RouterView v-if="isPublic" />
  <AdminLayout v-else />
</template>
