<template>
  <article class="log-entry" :class="playerClass">
    <header class="log-header">
      <span class="timestamp">{{ formattedTimestamp }}</span>
      <span class="model">{{ log.model }}</span>
      <span class="player">玩家 {{ log.playerType }}</span>
    </header>
    <section class="log-content">
      <div class="request">
        <h4>请求:</h4>
        <pre>{{ log.requestText }}</pre>
      </div>
      <div class="response">
        <h4>响应:</h4>
        <pre>{{ log.responseText }}</pre>
      </div>
    </section>
  </article>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatDateTime } from '@/utils/datetime.js';

  const props = defineProps({
    log: {
      type: Object,
      required: true,
    },
  });

  const playerClass = computed(() => {
    const type = props.log?.playerType;
    return type ? `player-${type}` : '';
  });

  const formattedTimestamp = computed(() => {
    if (!props.log?.timestamp) return '';
    return formatDateTime(props.log.timestamp);
  });
</script>

<style scoped>
  .log-entry {
    border-bottom: 1px solid #eee;
    padding: 15px;
    margin: 0;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-entry.player-1 {
    border-left: 4px solid #333;
    background: #fafafa;
  }

  .log-entry.player-2 {
    border-left: 4px solid #666;
    background: #f5f5f5;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 12px;
    color: #666;
  }

  .timestamp {
    font-weight: bold;
  }

  .model {
    color: #007acc;
  }

  .player {
    color: #cc6600;
  }

  .log-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .request,
  .response {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
  }

  .request h4,
  .response h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #333;
  }

  .request h4 {
    color: #006600;
  }

  .response h4 {
    color: #0066cc;
  }

  .request pre,
  .response pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 12px;
    line-height: 1.4;
    max-height: 200px;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .log-content {
      grid-template-columns: 1fr;
    }
  }
</style>
