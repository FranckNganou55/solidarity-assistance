<script setup>
defineProps({ label: { type: String, default: '' } })
</script>

<template>
  <div class="card table-card" :role="label ? 'region' : null" :aria-label="label || null"><slot /></div>
</template>
