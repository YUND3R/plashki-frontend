import { ref } from 'vue'
import { resetPassword } from '@/api/auth'

type ResetPasswordCredentials =
  | { token: string }
  | {
      tokenId: string
      signature: string
    }

export function useResetPasswordForm(initialCredentials: ResetPasswordCredentials | null) {
  const password = ref('')
  const passwordRepeat = ref('')
  const loading = ref(false)
  const submitted = ref(false)
  const successMessage = ref<string | null>(null)
  const serverError = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  function validate(): boolean {
    const err: Record<string, string> = {}
    if (!initialCredentials) {
      err.form = 'Ссылка для сброса недействительна или устарела'
    }

    if (!password.value) err.password = 'Укажите новый пароль'
    else if (password.value.length < 8) err.password = 'Минимум 8 символов'

    if (!passwordRepeat.value) err.passwordRepeat = 'Повторите пароль'
    else if (passwordRepeat.value !== password.value) err.passwordRepeat = 'Пароли не совпадают'

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
      const result = !initialCredentials
        ? { message: '' }
        : 'token' in initialCredentials
          ? await resetPassword({ token: initialCredentials.token, newPassword: password.value })
          : await resetPassword({
              token_id: initialCredentials.tokenId,
              signature: initialCredentials.signature,
              newPassword: password.value,
            })
      submitted.value = true
      successMessage.value = result.message
      password.value = ''
      passwordRepeat.value = ''
    } catch (e) {
      serverError.value = e instanceof Error ? e.message : 'Не удалось сбросить пароль'
    } finally {
      loading.value = false
    }
  }

  return {
    password,
    passwordRepeat,
    loading,
    submitted,
    successMessage,
    serverError,
    fieldErrors,
    submit,
  }
}
