<script setup>
import { computed } from 'vue'

const props = defineProps({
    status: { type: String, required: true },
    label: { type: String, required: true },
})

const statusClass = computed(() => props.status.toLowerCase())
</script>

<template>
    <span class="status-badge" :class="statusClass" :aria-label="label">{{ label }}</span>
</template>
