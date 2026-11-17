<script setup>
defineProps({
  label: { type: String, required: true },
  chooseLabel: { type: String, required: true },
  help: { type: String, required: true },
  fileName: { type: String, default: '' },
  accept: { type: String, default: '' },
})

const emit = defineEmits(['change'])

function onChange(event) {
  emit('change', event.target.files?.[0] || null)
}
</script>

<template>
  <div class="file-field">
    <span class="file-field__label">{{ label }}</span>
    <label class="file-picker" :class="{ 'file-picker--selected': fileName }">
      <input
        class="file-picker__input"
        type="file"
        :accept="accept || undefined"
        :aria-label="label"
        @change="onChange"
      >
      <span class="file-picker__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="file-picker__copy">
        <strong>{{ fileName || chooseLabel }}</strong>
        <small>{{ help }}</small>
      </span>
      <span class="file-picker__action">{{ fileName ? '✓' : '＋' }}</span>
    </label>
  </div>
</template>
