import { ref } from 'vue'
import { forgotPassword } from '@/api/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useForgotPasswordForm() {
  const email = ref('')
  const loading = ref(false)
  const submitted = ref(false)
  const successMessage = ref<string | null>(null)
  const serverError = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  function validate(): boolean {
    const err: Record<string, string> = {}
    const value = email.value.trim()
    if (!value) err.email = 'Укажите email'
    else if (!EMAIL_RE.test(value)) err.email = 'Некорректный email'
    fieldErrors.value = err
    return Object.keys(err).length === 0
  }

  async function submit() {
    serverError.value = null
    successMessage.value = null
    submitted.value = false
    if (!validate()) return

    loading.value = true
    try {
      await forgotPassword(email.value.trim())
      submitted.value = true
      successMessage.value =
        'Если адрес зарегистрирован, мы отправили письмо со ссылкой для сброса пароля.'
    } catch (e) {
      serverError.value = e instanceof Error ? e.message : 'Не удалось отправить письмо для сброса'
    } finally {
      loading.value = false
    }
  }

  return {
    email,
    loading,
    submitted,
    successMessage,
    serverError,
    fieldErrors,
    submit,
  }
}
