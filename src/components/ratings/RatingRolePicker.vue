<script setup lang="ts">
import type { RatingGameRole } from '@/api/ratings'
import mafiaIcon from '@/assets/icons/rating-mafia.svg?url'
import donIcon from '@/assets/icons/rating-don.svg?url'
import peacefulIcon from '@/assets/icons/rating-peaceful.svg?url'
import sheriffIcon from '@/assets/icons/rating-sheriff.svg?url'

const model = defineModel<RatingGameRole | null>({ required: true })

withDefaults(
  defineProps<{
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    disabled: false,
    ariaLabel: 'Роль игрока',
  },
)

const roles: Array<{ value: RatingGameRole; label: string; icon: string }> = [
  { value: 'mafia', label: 'Мафия', icon: mafiaIcon },
  { value: 'don', label: 'Дон', icon: donIcon },
  { value: 'peaceful', label: 'Мирный', icon: peacefulIcon },
  { value: 'sheriff', label: 'Шериф', icon: sheriffIcon },
]
</script>

<template>
  <div class="rating-role-picker" role="group" :aria-label="ariaLabel">
    <button
      v-for="role in roles"
      :key="role.value"
      type="button"
      class="rating-role-picker__button"
      :class="{ 'rating-role-picker__button--active': model != null && model === role.value }"
      :disabled="disabled"
      :aria-pressed="model != null && model === role.value"
      :title="role.label"
      @click="model = role.value"
    >
      <img :src="role.icon" :alt="role.label" class="rating-role-picker__icon" />
    </button>
  </div>
</template>

<style scoped>
.rating-role-picker {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rating-role-picker__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.12);
  cursor: pointer;
  box-sizing: border-box;
}

.rating-role-picker__button:hover:not(:disabled) {
  background: rgba(107, 114, 128, 0.18);
}

.rating-role-picker__button--active {
  background: #dbeafe;
}

.rating-role-picker__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.rating-role-picker__icon {
  display: block;
  width: 1.55rem;
  height: 1.55rem;
  object-fit: contain;
}

.rating-role-picker__button--active .rating-role-picker__icon {
  filter: brightness(0) saturate(100%) invert(39%) sepia(98%) saturate(1845%) hue-rotate(208deg)
    brightness(97%) contrast(98%);
}

</style>
