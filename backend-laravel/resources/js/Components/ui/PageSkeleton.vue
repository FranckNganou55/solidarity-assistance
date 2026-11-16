<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

defineProps({ label: { type: String, required: true } })
</script>

<template>
    <section class="page-skeleton" role="status" :aria-label="label">
        <SkeletonBlock class="skeleton-page-title" />
        <div class="page-skeleton-metrics">
            <SkeletonBlock v-for="item in 4" :key="item" class="skeleton-metric" />
        </div>
        <SkeletonBlock class="skeleton-panel" />
        <SkeletonBlock class="skeleton-rows" />
    </section>
</template>
