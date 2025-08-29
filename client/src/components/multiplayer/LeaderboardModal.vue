<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>🏆 排行榜</h3>
        <button class="close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="tabs">
          <button v-for="m in modes" :key="m.value" :class="['tab',{active: mode===m.value}]" @click="$emit('change-mode', m.value)">{{ m.label }}</button>
        </div>
        <div v-if="!list.length" class="empty">暂无数据</div>
        <ul v-else class="leaderboard">
          <li v-for="(p,i) in list" :key="p.session_id" :class="['item',{top:i<3}]">
            <span class="rank">{{ i+1 }}</span>
            <span class="name">{{ p.player_name }}</span>
            <span class="stats">胜 {{ p.wins }} · 最高 {{ p.best_score }} · 平均 {{ p.avg_score }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({ visible:Boolean, list:{type:Array,default:()=>[]}, mode:String });
const modes = [
  { value:'all', label:'全部' },
  { value:'shared', label:'共享模式' },
  { value:'competitive', label:'竞技模式' }
];
</script>
<style scoped>
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:2000;}
.modal{background:#fff;border-radius:12px;max-width:560px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #eee;}
.close{background:none;border:none;font-size:24px;cursor:pointer;}
.modal-body{padding:20px;}
.tabs{display:flex;gap:8px;margin-bottom:16px;}
.tab{flex:1;padding:8px 10px;border:1px solid #ddd;background:#f8f9fa;border-radius:6px;cursor:pointer;font-size:13px;}
.tab.active{background:#667eea;color:#fff;border-color:#667eea;}
.leaderboard{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.item{display:flex;align-items:center;gap:12px;padding:10px 12px;background:#f8f9fa;border-radius:8px;}
.item.top{background:#fff7e6;}
.rank{width:24px;text-align:center;font-weight:700;}
.name{font-weight:600;}
.stats{margin-left:auto;font-size:12px;color:#555;}
.empty{text-align:center;color:#666;padding:40px 0;}
</style>
