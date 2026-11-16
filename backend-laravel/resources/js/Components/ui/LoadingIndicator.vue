<script setup>
defineProps({ label: { type: String, required: true } })
</script>

<template>
    <div class="loading-line" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ label }}</span>
    </div>
</template>
