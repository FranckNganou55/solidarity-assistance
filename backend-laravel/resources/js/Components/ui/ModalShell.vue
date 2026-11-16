<script setup>
defineProps({ closeOnBackdrop: { type: Boolean, default: true } })
defineEmits(['close'])
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="closeOnBackdrop && $emit('close')"><slot /></div>
</template>
