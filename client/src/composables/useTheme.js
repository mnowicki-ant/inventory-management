import { ref, watchEffect } from 'vue'

const stored = localStorage.getItem('app-theme')
const isDark = ref(stored === 'dark')

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('app-theme', isDark.value ? 'dark' : 'light')
})

export function useTheme() {
  const toggle = () => { isDark.value = !isDark.value }
  return { isDark, toggle }
}
