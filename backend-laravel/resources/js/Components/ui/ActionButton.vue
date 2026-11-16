<script setup>
import { computed } from 'vue'

const props = defineProps({
    variant: { type: String, default: 'primary' },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
})

const classes = computed(() => ({
    'primary-button': props.variant === 'primary',
    'secondary-button': props.variant === 'secondary',
    'small-primary': props.variant === 'success',
    'small-danger': props.variant === 'danger',
    'small-button': props.variant === 'small',
    'icon-button': props.variant === 'icon',
}))
</script>

<template>
    <button :type="type" :class="classes" :disabled="disabled"><slot /></button>
</template>
