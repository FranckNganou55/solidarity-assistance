<script setup>
defineProps({
    title: { type: String, required: true },
    icon: { type: String, default: '◇' },
    description: { type: String, default: '' },
})
</script>

<template>
    <div class="card empty-state" role="status">
        <span class="empty-state-icon" aria-hidden="true">{{ icon }}</span>
        <strong>{{ title }}</strong>
        <p v-if="description">{{ description }}</p>
        <slot />
    </div>
</template>
