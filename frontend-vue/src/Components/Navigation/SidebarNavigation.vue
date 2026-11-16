<script setup>
import { RouterLink } from 'vue-router'

defineProps({ sections: { type: Array, required: true }, translate: { type: Function, required: true } })
defineEmits(['navigate'])
</script>

<template>
  <section v-for="section in sections" :key="section.section" class="nav-section">
    <h3>{{ translate(section.section) }}</h3>
    <RouterLink v-for="[label, icon, path] in section.links" :key="path" :to="path" class="nav-link" @click="$emit('navigate')">
      <span>{{ icon }}</span>{{ translate(label) }}
    </RouterLink>
  </section>
</template>
