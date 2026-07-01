<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listAdminUsers, me, type AdminUser } from '@/api/auth'
import type { AdminUserListParams } from '@/api/listQuery'
import { useDebouncedRef } from '@/composables/useDebouncedRef'

const PAGE_SIZE = 50

const loading = ref(true)
const error = ref<string | null>(null)
const forbidden = ref(false)
const users = ref<AdminUser[]>([])
const searchInput = ref('')
const debouncedSearch = useDebouncedRef(searchInput, 400)
const roleFilter = ref<AdminUserListParams['role'] | ''>('')
const subscriptionFilter = ref<AdminUserListParams['subscription'] | ''>('')
const sortBy = ref<NonNullable<AdminUserListParams['sort_by']>>('created_at')
const sortOrder = ref<'asc' | 'desc'>('asc')
const page = ref(0)

function fullName(u: AdminUser): string {
  const first = typeof u.first_name === 'string' ? u.first_name.trim() : ''
  const last = typeof u.last_name === 'string' ? u.last_name.trim() : ''
  const value = `${first} ${last}`.trim()
  return value || '-'
}

function roleLabel(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toUpperCase()
  return value || 'USER'
}

function subscriptionLabel(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase()
  if (s === 'basic' || s === 'free') return 'Базовый'
  if (s === 'standard') return 'Стандарт'
  if (s === 'premium') return 'Премиум'
  return s ? s : '-'
}

function createdAtLabel(raw: string | null | undefined): string {
  if (!raw) return '-'
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return raw
  return new Date(ms).toLocaleString('ru-RU')
}

const pageFrom = computed(() => (users.value.length ? page.value * PAGE_SIZE + 1 : 0))

const pageTo = computed(() => page.value * PAGE_SIZE + users.value.length)

const hasNextPage = computed(() => users.value.length >= PAGE_SIZE)

function buildParams(): AdminUserListParams {
  return {
    q: debouncedSearch.value || undefined,
    role: roleFilter.value || undefined,
    subscription: subscriptionFilter.value || undefined,
    sort_by: sortBy.value,
    sort_order: sortOrder.value,
    limit: PAGE_SIZE,
    offset: page.value * PAGE_SIZE,
  }
}

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
    users.value = await listAdminUsers(buildParams())
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    users.value = []
  } finally {
    loading.value = false
  }
}

watch([debouncedSearch, roleFilter, subscriptionFilter, sortBy, sortOrder], () => {
  if (page.value !== 0) {
    page.value = 0
  } else {
    void loadAdminUsers()
  }
})

watch(page, () => {
  void loadAdminUsers()
})

onMounted(() => {
  void loadAdminUsers()
})
</script>

<template>
  <section class="admin-users">
    <header class="admin-users__header">
      <h2 class="admin-users__title">Пользователи</h2>
      <p v-if="!loading && !forbidden && !error" class="admin-users__count">
        Показано: {{ pageFrom }}–{{ pageTo }}
      </p>
    </header>

    <div v-if="!forbidden" class="admin-users__toolbar" role="toolbar" aria-label="Фильтры пользователей">
      <input
        v-model="searchInput"
        class="admin-users__search"
        type="search"
        name="admin_user_search"
        placeholder="Поиск по логину, email, имени…"
        autocomplete="off"
        aria-label="Поиск пользователей"
      />
      <label class="admin-users__filter">
        <span class="admin-users__filter-label">Роль</span>
        <select v-model="roleFilter" class="admin-users__select" aria-label="Фильтр по роли">
          <option value="">Все</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="sponsor">Sponsor</option>
          <option value="user">User</option>
        </select>
      </label>
      <label class="admin-users__filter">
        <span class="admin-users__filter-label">Подписка</span>
        <select v-model="subscriptionFilter" class="admin-users__select" aria-label="Фильтр по подписке">
          <option value="">Все</option>
          <option value="free">Базовый</option>
          <option value="standard">Стандарт</option>
          <option value="premium">Премиум</option>
        </select>
      </label>
      <label class="admin-users__filter">
        <span class="admin-users__filter-label">Сортировка</span>
        <select v-model="sortBy" class="admin-users__select" aria-label="Поле сортировки">
          <option value="created_at">По дате</option>
          <option value="username">По логину</option>
          <option value="email">По email</option>
        </select>
      </label>
      <label class="admin-users__filter">
        <span class="admin-users__filter-label">Порядок</span>
        <select v-model="sortOrder" class="admin-users__select" aria-label="Направление сортировки">
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </label>
    </div>

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

    <nav
      v-if="!loading && !forbidden && !error && (page > 0 || hasNextPage)"
      class="admin-users__pagination"
      aria-label="Страницы списка пользователей"
    >
      <button type="button" class="admin-users__page-btn" :disabled="page === 0 || loading" @click="page -= 1">
        Назад
      </button>
      <span class="admin-users__page-info">Страница {{ page + 1 }}</span>
      <button type="button" class="admin-users__page-btn" :disabled="!hasNextPage || loading" @click="page += 1">
        Вперёд
      </button>
    </nav>
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

.admin-users__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 0.75rem;
}

.admin-users__search {
  flex: 1 1 14rem;
  min-width: 12rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
}

.admin-users__filter {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.admin-users__filter-label {
  line-height: 1.2;
}

.admin-users__select {
  min-width: 7.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8125rem;
  color: #111827;
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

.admin-users__pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-users__page-btn {
  padding: 0.35rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
}

.admin-users__page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-users__page-info {
  font-size: 0.8125rem;
  color: #6b7280;
}

@media (max-width: 1024px) {
  .admin-users__table {
    min-width: 720px;
  }
}
</style>
