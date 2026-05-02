import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export function useLoginForm() {
  const router = useRouter()
  const auth = useAuthStore()

  const loginValue = ref('')
  const password = ref('')
  const loading = ref(false)
  const serverError = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  function validate(): boolean {
    const err: Record<string, string> = {}
    if (!loginValue.value.trim()) err.loginValue = 'Укажите логин или email'
    if (!password.value) err.password = 'Укажите пароль'
    fieldErrors.value = err
    return Object.keys(err).length === 0
  }

  function normalizeLoginErrorMessage(message: string): string {
    if (message.includes('POST /auth/resend-verification')) {
      return 'Сначала подтвердите email.'
    }
    return message
  }

  async function submit() {
    serverError.value = null
    if (!validate()) return

    loading.value = true
    try {
      await login(loginValue.value.trim(), password.value)
      auth.syncToken()
      await router.push({ name: 'dashboard' })
    } catch (e) {
      serverError.value =
        e instanceof Error ? normalizeLoginErrorMessage(e.message) : 'Не удалось войти'
    } finally {
      loading.value = false
    }
  }

  return {
    loginValue,
    password,
    loading,
    serverError,
    fieldErrors,
    submit,
  }
}
