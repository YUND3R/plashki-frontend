<script setup lang="ts">
import { computed } from 'vue'
import leftArrowIcon from '@/assets/icons/left_arrow.svg?url'
import rightArrowIcon from '@/assets/icons/right_arrow.svg?url'
import type { RatingGameRole } from '@/api/ratings'

export type AddGameRoleOption = {
  value: RatingGameRole
  label: string
  icon: string
  toneClass: string
}

const model = defineModel<RatingGameRole>({ required: true })

const props = withDefaults(
  defineProps<{
    options: AddGameRoleOption[]
    ariaLabel?: string
    disabled?: boolean
  }>(),
  {
    ariaLabel: undefined,
    disabled: false,
  },
)

const roleOrder = computed(() => props.options.map((item) => item.value))

const currentOption = computed(
  () => props.options.find((item) => item.value === model.value) ?? props.options[0],
)

function shift(direction: -1 | 1) {
  if (props.disabled) return
  const order = roleOrder.value
  const index = order.indexOf(model.value)
  if (index < 0) return
  const nextIndex = (index + direction + order.length) % order.length
  model.value = order[nextIndex]
}
</script>

<template>
  <div
    class="add-game-role-stepper"
    :class="{ 'add-game-role-stepper--disabled': disabled }"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      type="button"
      class="add-game-role-stepper__btn"
      :disabled="disabled"
      aria-label="Предыдущая роль"
      @click="shift(-1)"
    >
      <img :src="leftArrowIcon" alt="" aria-hidden="true" />
    </button>
    <div class="add-game-role-stepper__current" :title="currentOption?.label">
      <img
        v-if="currentOption"
        :src="currentOption.icon"
        :alt="currentOption.label"
        class="add-game-role-stepper__icon"
        :class="currentOption.toneClass"
      />
    </div>
    <button
      type="button"
      class="add-game-role-stepper__btn"
      :disabled="disabled"
      aria-label="Следующая роль"
      @click="shift(1)"
    >
      <img :src="rightArrowIcon" alt="" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.add-game-role-stepper {
  display: grid;
  grid-template-columns: 1.75rem 1fr 1.75rem;
  align-items: center;
  gap: 0.15rem;
  width: 100%;
  min-height: 2.25rem;
}

.add-game-role-stepper__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.add-game-role-stepper__btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.add-game-role-stepper__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.add-game-role-stepper__btn img {
  display: block;
  width: 0.85rem;
  height: 0.85rem;
  opacity: 0.72;
}

.add-game-role-stepper__current {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.add-game-role-stepper__icon {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
  object-fit: contain;
}

.add-game-role-stepper__icon--peaceful {
  filter: brightness(0) saturate(100%) invert(36%) sepia(72%) saturate(1400%) hue-rotate(328deg)
    brightness(95%) contrast(92%);
}

.add-game-role-stepper__icon--mafia,
.add-game-role-stepper__icon--don {
  filter: brightness(0) saturate(100%) invert(40%) sepia(52%) saturate(1200%) hue-rotate(196deg)
    brightness(96%) contrast(92%);
}

.add-game-role-stepper__icon--sheriff {
  filter: brightness(0) saturate(100%) invert(46%) sepia(38%) saturate(900%) hue-rotate(118deg)
    brightness(94%) contrast(90%);
}
</style>
