<script setup>
defineProps({
    message: { type: String, required: true },
    kind: { type: String, default: 'info' },
})
</script>

<template>
    <div class="toast" :class="kind" role="status" aria-live="polite">{{ message }}</div>
</template>
