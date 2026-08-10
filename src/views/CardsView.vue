<script setup lang="ts">
import CardDesignPickerPanel from '@/components/cardDesign/CardDesignPickerPanel.vue'

const DEMO_LOBBY_ID = ''
</script>

<template>
  <section class="card-design">
    <article class="card-design__panel">
      <CardDesignPickerPanel
        key="catalog-preview"
        :lobby-id="DEMO_LOBBY_ID"
        :show-lobby-context="false"
        :show-save-action="false"
      />
    </article>
  </section>
</template>

<style scoped>
.card-design {
  width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.card-design__panel {
  border: none;
  border-radius: 0;
  background: #fff;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
