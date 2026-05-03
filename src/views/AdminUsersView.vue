<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listAdminUsers, me, type AdminUser } from '@/api/auth'

const loading = ref(true)
const error = ref<string | null>(null)
const forbidden = ref(false)
const users = ref<AdminUser[]>([])

function fullName(u: AdminUser): string {
  const first = typeof u.first_name === 'string' ? u.first_name.trim() : ''
  const last = typeof u.last_name === 'string' ? u.last_name.trim() : ''
  const value = `${first} ${last}`.trim()
  return value || '—'
}

function roleLabel(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toUpperCase()
  return value || 'USER'
}

function subscriptionLabel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase()
  if (s === 'basic') return 'Базовый'
  if (s === 'standard') return 'Стандарт'
  if (s === 'premium') return 'Премиум'
  return s ? s : '—'
}

function createdAtLabel(raw: string | null | undefined): string {
  if (!raw) return '—'
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return raw
  return new Date(ms).toLocaleString('ru-RU')
}

const totalUsers = computed(() => users.value.length)

async function loadAdminUsers() {
  loading.value = true
  error.value = null
  forbidden.value = false
  try {
    const profile = await me()
    if ((profile.role ?? '').trim().toUpperCase() !== 'ADMIN') {
      forbidden.value = true
      users.value = []
      return
    }
    users.value = await listAdminUsers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAdminUsers()
})
</script>

<template>
  <section class="admin-users">
    <header class="admin-users__header">
      <h2 class="admin-users__title">Пользователи</h2>
      <p class="admin-users__count">Всего: {{ totalUsers }}</p>
    </header>

    <p v-if="loading" class="admin-users__status">Загружаем список пользователей…</p>
    <p v-else-if="forbidden" class="admin-users__status admin-users__status--error" role="alert">
      Доступ только для ADMIN.
    </p>
    <p v-else-if="error" class="admin-users__status admin-users__status--error" role="alert">{{ error }}</p>

    <div v-else-if="users.length" class="admin-users__table-wrap">
      <table class="admin-users__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Логин</th>
            <th>Email</th>
            <th>Имя</th>
            <th>Роль</th>
            <th>Подписка</th>
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="admin-users__mono">{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.email }}</td>
            <td>{{ fullName(u) }}</td>
            <td>{{ roleLabel(u.role) }}</td>
            <td>{{ subscriptionLabel(u.subscription_tier) }}</td>
            <td>{{ createdAtLabel(u.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="admin-users__status">Список пользователей пуст.</p>
  </section>
</template>

<style scoped>
.admin-users {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  padding: 0.25rem 0.2rem 0.85rem;
  box-sizing: border-box;
}

.admin-users__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.admin-users__title {
  margin: 0;
  font-size: 1.125rem;
  color: #111827;
}

.admin-users__count {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.admin-users__status {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.admin-users__status--error {
  color: #b91c1c;
}

.admin-users__table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: auto;
  background: #ffffff;
}

.admin-users__table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.admin-users__table th,
.admin-users__table td {
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  font-size: 0.8125rem;
  color: #1f2937;
  vertical-align: top;
}

.admin-users__table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.admin-users__mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.75rem;
  color: #475569;
}
</style>
