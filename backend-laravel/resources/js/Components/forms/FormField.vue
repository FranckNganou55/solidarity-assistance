<script setup>
defineProps({
    invalid: { type: Boolean, default: false },
    error: { type: String, default: '' },
    hint: { type: String, default: '' },
})
</script>

<template>
    <label class="form-field" :class="{ 'has-error': invalid || error }">
        <slot />
        <span v-if="hint" class="field-hint">{{ hint }}</span>
        <span v-if="error" class="field-error" role="alert">{{ error }}</span>
    </label>
</template>
