<script setup>
defineProps({
    as: { type: String, default: 'div' },
    rounded: { type: Boolean, default: false },
})
</script>

<template>
    <component :is="as" class="skeleton" :class="{ 'skeleton-rounded': rounded }" aria-hidden="true">
        <slot />
    </component>
</template>
