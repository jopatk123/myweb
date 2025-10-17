<template>
  <div class="ai-logs-page">
    <AILogsViewer />
  </div>
</template>

<script>
  import AILogsViewer from '../components/common/AILogsViewer.vue';

  export default {
    name: 'AILogsPage',
    components: {
      AILogsViewer,
    },
  };
</script>

<style scoped>
  .ai-logs-page {
    min-height: 100vh;
    background: #f0f0f0;
    padding: 20px 0;
  }
</style>
