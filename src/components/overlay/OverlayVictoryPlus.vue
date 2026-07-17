<script setup lang="ts">
import type { LobbyPlayer } from '@/api/lobbies'
import OverlayVictoryScreen from './OverlayVictoryScreen.vue'

defineProps<{
  winner: 'mafia' | 'peaceful'
  seats: Array<LobbyPlayer | null>
  persistentMessage?: string
  showScores?: boolean
}>()
</script>

<template>
  <OverlayVictoryScreen
    :winner="winner"
    :seats="seats"
    design-code="plus"
    :persistent-message="persistentMessage"
    :show-scores="showScores"
  />
</template>
