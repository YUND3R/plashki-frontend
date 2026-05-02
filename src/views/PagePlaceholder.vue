<template>
  <section class="page">
    <div class="page__center">
      <p class="page__hint">Раздел в разработке.</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  width: 100%;
  box-sizing: border-box;
}

.page__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: min(70vh, 36rem);
  padding: 2rem 1.25rem;
  box-sizing: border-box;
  text-align: center;
}

.page__hint {
  margin: 0;
  max-width: 24rem;
  color: #6b7280;
  font-size: 0.9375rem;
  line-height: 1.5;
}
</style>
