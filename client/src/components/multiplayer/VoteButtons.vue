<template>
  <div class="vote-buttons" v-if="mode==='shared'">
    <button v-for="d in directions" :key="d" :class="['vote-btn',{active: currentVote===d}]" @click="$emit('vote', d)">
      {{ icons[d] }} {{ labels[d] }}
    </button>
  </div>
</template>
<script setup>
const props = defineProps({
  currentVote: String,
  mode: { type: String, default: 'shared' }
});
const directions = ['up','down','left','right'];
const labels = { up: '上', down: '下', left: '左', right: '右' };
const icons = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
</script>
<style scoped>
.vote-buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-width:200px;margin:8px auto;}
.vote-btn{padding:8px 12px;border:2px solid #ccc;background:#fff;border-radius:6px;cursor:pointer;font-weight:600;}
.vote-btn.active{border-color:#667eea;background:#eef2ff;}
.vote-btn:hover{border-color:#667eea;}
</style>
