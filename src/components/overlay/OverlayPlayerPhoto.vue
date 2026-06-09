<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import {
  photoFrameImgStyle,
  resolveLobbyPlayerPhotoFrame,
  rowPhoto,
} from '@/utils/playerCardPhotoFrame'
import { overlayPhotoCropViewport, overlayPhotoSpecForDesign } from '@/utils/overlayPhotoSpec'

const props = defineProps<{
  player: LobbyPlayer | null
  designCode: string
  imgClass?: string
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const natural = ref({ w: 0, h: 0 })

const photoUrl = computed(() => rowPhoto(props.player))

const frame = computed(() => {
  const url = photoUrl.value
  if (!url || !props.player) return null
  return resolveLobbyPlayerPhotoFrame(props.player, url)
})

const spec = computed(() => overlayPhotoSpecForDesign(props.designCode))

const imgStyle = computed(() => {
  if (!frame.value) return {}
  const { w: nw, h: nh } = natural.value
  const { cw, ch } = overlayPhotoCropViewport(spec.value)
  const meta = nw >= 1 && nh >= 1 ? { cw, ch, nw, nh } : null
  return photoFrameImgStyle(frame.value, meta)
})

function syncNaturalFromImg(img: HTMLImageElement | null) {
  if (!img?.naturalWidth || !img.naturalHeight) return
  natural.value = {
    w: img.naturalWidth,
    h: img.naturalHeight,
  }
}

function onImgLoad(ev: Event) {
  syncNaturalFromImg(ev.target as HTMLImageElement)
}

watch(photoUrl, async () => {
  natural.value = { w: 0, h: 0 }
  await nextTick()
  syncNaturalFromImg(imgRef.value)
})
</script>

<template>
  <img
    v-if="photoUrl"
    ref="imgRef"
    :src="photoUrl"
    alt=""
    :class="imgClass"
    :style="imgStyle"
    draggable="false"
    @load="onImgLoad"
  />
</template>
