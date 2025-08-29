<template>
  <div v-if="Object.keys(votes).length" class="voters-display">
    <h4>当前投票</h4>
    <div class="votes-grid">
      <div v-for="(info, sid) in votes" :key="sid" class="vote-item" :style="{borderColor: info.player_color}">
        <span class="dir">{{ dirIcon(info.direction) }}</span>
        <span class="name" :style="{color: info.player_color}">{{ info.player_name }}</span>
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({ votes: { type:Object, default:()=>({}) } });
const dirIcon = d => ({up:'⬆️',down:'⬇️',left:'⬅️',right:'➡️'})[d] || d;
</script>
<style scoped>
.voters-display{background:#fff;border:1px solid #eee;padding:12px 14px;border-radius:10px;}
.votes-grid{display:flex;flex-wrap:wrap;gap:8px;}
.vote-item{display:flex;align-items:center;gap:6px;padding:6px 10px;border:2px solid #ccc;border-radius:8px;background:#f8f9fa;}
.dir{font-size:18px;}
.name{font-size:13px;font-weight:600;}
</style>
