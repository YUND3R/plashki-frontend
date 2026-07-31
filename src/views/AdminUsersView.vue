<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listAdminUsers, me, type AdminUser } from '@/api/auth'
import type { AdminUserListParams } from '@/api/listQuery'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import AdminFilterSelect from '@/components/admin/AdminFilterSelect.vue'
import AppPageError from '@/components/common/AppPageError.vue'

const PAGE_SIZE = 50

const roleOptions = [
  { value: '', label: 'Все' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'user', label: 'User' },
] as const

const subscriptionOptions = [
  { value: '', label: 'Все' },
  { value: 'free', label: 'Базовый' },
  { value: 'standard', label: 'Стандарт' },
  { value: 'premium', label: 'Премиум' },
] as const

const sortByOptions = [
  { value: 'created_at', label: 'По дате' },
  { value: 'username', label: 'По логину' },
  { value: 'email', label: 'По email' },
] as const

const sortOrderOptions = [
  { value: 'asc', label: 'По возрастанию' },
  { value: 'desc', label: 'По убыванию' },
] as const

const loading = ref(true)
const error = ref<string | null>(null)
const forbidden = ref(false)
const users = ref<AdminUser[]>([])
const searchInput = ref('')
const debouncedSearch = useDebouncedRef(searchInput, 400)
const roleFilter = ref('')
const subscriptionFilter = ref('')
const sortBy = ref('created_at')
const sortOrder = ref('asc')
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
  const role = roleFilter.value
  const subscription = subscriptionFilter.value
  const sortField = sortBy.value
  const order = sortOrder.value
  return {
    q: debouncedSearch.value || undefined,
    role: role === 'admin' || role === 'moderator' || role === 'sponsor' || role === 'user' ? role : undefined,
    subscription:
      subscription === 'free' || subscription === 'standard' || subscription === 'premium'
        ? subscription
        : undefined,
    sort_by:
      sortField === 'created_at' || sortField === 'username' || sortField === 'email' ? sortField : 'created_at',
    sort_order: order === 'desc' ? 'desc' : 'asc',
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
      <div class="admin-users__search-wrap">
        <span class="admin-users__search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <input
          v-model="searchInput"
          class="admin-users__search"
          type="search"
          name="admin_user_search"
          placeholder="Поиск по логину, email, имени…"
          autocomplete="off"
          aria-label="Поиск пользователей"
        />
        <button
          v-if="searchInput.trim()"
          type="button"
          class="admin-users__search-clear"
          aria-label="Очистить поиск"
          @click="searchInput = ''"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
      <div class="admin-users__filters">
        <AdminFilterSelect
          v-model="roleFilter"
          label="Роль"
          aria-label="Фильтр по роли"
          :options="[...roleOptions]"
        />
        <AdminFilterSelect
          v-model="subscriptionFilter"
          label="Подписка"
          aria-label="Фильтр по подписке"
          :options="[...subscriptionOptions]"
        />
        <AdminFilterSelect
          v-model="sortBy"
          label="Сортировка"
          aria-label="Поле сортировки"
          default-value="created_at"
          :options="[...sortByOptions]"
        />
        <AdminFilterSelect
          v-model="sortOrder"
          label="Порядок"
          aria-label="Направление сортировки"
          default-value="asc"
          :options="[...sortOrderOptions]"
        />
      </div>
    </div>

    <p v-if="loading" class="admin-users__status">Загружаем список пользователей…</p>
    <div v-else-if="forbidden" class="admin-users__page-error">
      <AppPageError title="Нет доступа" message="Доступ только для ADMIN." :show-auth-actions="false" />
    </div>
    <div v-else-if="error" class="admin-users__page-error">
      <AppPageError :message="error" @retry="loadAdminUsers" />
    </div>

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
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fafbfc;
}

.admin-users__filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  width: 100%;
}

.admin-users__search-wrap {
  flex: 1 1 100%;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0 0.75rem 0 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.admin-users__search-wrap:focus-within {
  border-color: #93c5fd;
  background: #fff;
}

.admin-users__search-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: color 0.15s ease;
}

.admin-users__search-wrap:focus-within .admin-users__search-icon {
  color: #2f6feb;
}

.admin-users__search {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  padding: 0.45rem 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.35;
  color: #111827;
  -webkit-appearance: none;
  appearance: none;
}

.admin-users__search:focus {
  outline: none;
}

.admin-users__search::placeholder {
  color: #9ca3af;
}

.admin-users__search::-webkit-search-cancel-button,
.admin-users__search::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.admin-users__search-clear {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.admin-users__search-clear:hover {
  background: #e5e7eb;
  color: #374151;
}

.admin-users__search-clear:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 1px;
}

@media (min-width: 900px) {
  .admin-users__search-wrap {
    max-width: none;
  }
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
  .admin-users__filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-users__table {
    min-width: 720px;
  }
}

@media (max-width: 560px) {
  .admin-users__filters {
    grid-template-columns: 1fr;
  }

  .admin-users__toolbar {
    padding: 0.75rem;
  }
}
</style>
