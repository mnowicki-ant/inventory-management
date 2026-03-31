<template>
  <button class="theme-toggle" @click="toggle" :title="isDark ? 'Light mode' : 'Dark mode'">
    <svg v-if="isDark" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
      <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.66 4.34L14.24 5.76M5.76 14.24L4.34 15.66M15.66 15.66L14.24 14.24M5.76 5.76L4.34 4.34" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17.5 10.5A7.5 7.5 0 0 1 9.5 2.5a7.5 7.5 0 1 0 8 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  </button>
</template>

<script setup>
import { useTheme } from '../composables/useTheme'
const { isDark, toggle } = useTheme()
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.theme-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}
</style>
