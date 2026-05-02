import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register, resendVerification } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export function useRegisterForm() {
  const router = useRouter()
  const auth = useAuthStore()

  const username = ref('')
  const email = ref('')
  const firstName = ref('')
  const lastName = ref('')
  const avatarFile = ref<File | null>(null)
  const password = ref('')
  const passwordRepeat = ref('')
  const loading = ref(false)
  const serverError = ref<string | null>(null)
  const registrationMessage = ref<string | null>(null)
  const emailVerificationRequired = ref(false)
  const resendLoading = ref(false)
  const resendMessage = ref<string | null>(null)
  const resendError = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  function validate(): boolean {
    const err: Record<string, string> = {}
    const u = username.value.trim()
    if (!u) err.username = 'Укажите логин'
    else if (u.length < 3) err.username = 'Минимум 3 символа'
    else if (u.length > 50) err.username = 'Не длиннее 50 символов'
    else if (!/^[a-zA-Z0-9._-]+$/.test(u)) {
      err.username = 'Латиница, цифры, . _ -'
    }

    const em = email.value.trim()
    if (!em) err.email = 'Укажите email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) err.email = 'Некорректный email'

    const fn = firstName.value.trim()
    if (!fn) err.firstName = 'Укажите имя'
    else if (fn.length > 100) err.firstName = 'Не длиннее 100 символов'

    const ln = lastName.value.trim()
    if (!ln) err.lastName = 'Укажите фамилию'
    else if (ln.length > 100) err.lastName = 'Не длиннее 100 символов'

    if (!password.value) err.password = 'Укажите пароль'
    else if (password.value.length < 8) err.password = 'Минимум 8 символов'

    if (!passwordRepeat.value) err.passwordRepeat = 'Повторите пароль'
    else if (passwordRepeat.value !== password.value) err.passwordRepeat = 'Пароли не совпадают'

    fieldErrors.value = err
    return Object.keys(err).length === 0
  }

  function onAvatarChange(ev: Event) {
    const input = ev.target as HTMLInputElement
    avatarFile.value = input.files?.[0] ?? null
  }

  async function submit() {
    serverError.value = null
    registrationMessage.value = null
    emailVerificationRequired.value = false
    resendMessage.value = null
    resendError.value = null
    if (!validate()) return

    loading.value = true
    try {
      const response = await register(
        username.value.trim(),
        email.value.trim(),
        password.value,
        firstName.value.trim(),
        lastName.value.trim(),
        avatarFile.value,
      )
      if (response.access_token) {
        auth.syncToken()
        await router.push({ name: 'dashboard' })
        return
      }
      emailVerificationRequired.value = true
      registrationMessage.value =
        response.message ?? 'Регистрация прошла успешно. Подтвердите email по ссылке из письма.'
    } catch (e) {
      serverError.value = e instanceof Error ? e.message : 'Не удалось зарегистрироваться'
    } finally {
      loading.value = false
    }
  }

  async function resendVerificationEmail() {
    resendMessage.value = null
    resendError.value = null
    const em = email.value.trim()
    if (!em) {
      resendError.value = 'Email не найден. Укажите email и зарегистрируйтесь снова.'
      return
    }

    resendLoading.value = true
    try {
      const result = await resendVerification(em)
      resendMessage.value = result.message || 'Письмо отправлено повторно.'
    } catch (e) {
      resendError.value = e instanceof Error ? e.message : 'Не удалось отправить письмо повторно'
    } finally {
      resendLoading.value = false
    }
  }

  return {
    username,
    email,
    firstName,
    lastName,
    avatarFile,
    password,
    passwordRepeat,
    loading,
    serverError,
    registrationMessage,
    emailVerificationRequired,
    resendLoading,
    resendMessage,
    resendError,
    fieldErrors,
    onAvatarChange,
    submit,
    resendVerificationEmail,
  }
}
