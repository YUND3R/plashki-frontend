<script setup lang="ts">
import LobbyManageView from '@/views/LobbyManageView.vue'
</script>

<template>
  <div class="iphone-preview">
    <header class="iphone-preview__status" aria-hidden="true">
      <time class="iphone-preview__time" datetime="09:41">9:41</time>
      <div class="iphone-preview__status-icons">
        <span class="iphone-preview__signal" />
        <span class="iphone-preview__wifi" />
        <span class="iphone-preview__battery" />
      </div>
    </header>

    <div class="iphone-preview__app">
      <LobbyManageView embedded-preview />
    </div>
  </div>
</template>

<style scoped>
.iphone-preview {
  --iphone-preview-width: 390px;
  --iphone-preview-height: 844px;
  --iphone-preview-status-h: 54px;

  width: var(--iphone-preview-width);
  height: var(--iphone-preview-height);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
}

.iphone-preview__status {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: var(--iphone-preview-status-h);
  padding: 0 1.35rem 0.45rem;
  box-sizing: border-box;
}

.iphone-preview__time {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}

.iphone-preview__status-icons {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.iphone-preview__signal,
.iphone-preview__wifi,
.iphone-preview__battery {
  display: block;
  background: #111827;
}

.iphone-preview__signal {
  width: 1.05rem;
  height: 0.62rem;
  clip-path: polygon(0 100%, 20% 55%, 40% 75%, 60% 35%, 80% 55%, 100% 0, 100% 100%);
}

.iphone-preview__wifi {
  width: 0.95rem;
  height: 0.7rem;
  border-radius: 999px 999px 0 0;
  border: 2px solid #111827;
  border-bottom: none;
  box-sizing: border-box;
  transform: scale(0.9);
}

.iphone-preview__battery {
  width: 1.45rem;
  height: 0.68rem;
  border: 1.5px solid rgba(17, 24, 39, 0.45);
  border-radius: 0.2rem;
  position: relative;
  box-sizing: border-box;
}

.iphone-preview__battery::before {
  content: '';
  position: absolute;
  inset: 1px 3px 1px 1px;
  border-radius: 0.12rem;
  background: #111827;
}

.iphone-preview__battery::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -0.18rem;
  width: 0.12rem;
  height: 0.28rem;
  border-radius: 0 1px 1px 0;
  background: rgba(17, 24, 39, 0.45);
  transform: translateY(-50%);
}

.iphone-preview__app {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview) {
  height: 100%;
  min-height: 0;
  max-height: none;
  padding-top: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  box-sizing: border-box;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__main-actions) {
  display: none;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__swap-hint) {
  display: none;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__grid) {
  height: 100%;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__card--main) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: none;
  box-shadow: none;
  border-radius: 0;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__table-wrap) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__table-wrap::-webkit-scrollbar) {
  display: none;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__mobile-bottom-spacer) {
  display: block;
  height: calc(10.35rem + env(safe-area-inset-bottom, 0px));
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__mobile-dock-wrap) {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  border-radius: 0;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__mobile-dock-timer-value) {
  font-variant-numeric: tabular-nums;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__row) {
  scroll-margin-top: 0.5rem;
}

.iphone-preview__app :deep(.lobby-manage--embedded-preview .lobby-manage__host-info-tip) {
  display: none;
}
</style>
