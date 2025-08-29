<template>
  <div class="empty-slot">
    <div class="empty-avatar"><span class="empty-icon">👤</span></div>
    <div class="empty-info"><div class="empty-text">等待玩家加入...</div></div>
  </div>
</template>
<script>
export default { name: 'EmptySlot' }
</script>
<style scoped>
.empty-slot { display:flex; align-items:center; gap:12px; padding:12px; background:#f8f9fa; border-radius:8px; border:2px dashed #dee2e6; opacity:.6; }
.empty-avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#e9ecef; color:#6c757d; font-size:20px; }
.empty-info { flex:1; }
.empty-text { color:#6c757d; font-style:italic; font-size:14px; }
@media (max-width:600px){
  .empty-slot { padding:10px; }
  .empty-avatar { width:40px; height:40px; font-size:16px; }
  .empty-text { font-size:12px; }
}
</style>
