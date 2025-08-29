<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>📊 我的统计</h3>
        <button class="close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body" v-if="stats">
        <div class="stats-grid">
          <div class="stat" v-for="item in mapped" :key="item.label">
            <div class="value">{{ item.value }}</div>
            <div class="label">{{ item.label }}</div>
          </div>
        </div>
      </div>
      <div class="modal-body" v-else>暂无统计数据</div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({ visible: Boolean, stats: Object });
const mapped = computed(()=>{
  if(!props.stats?.stats) return [];
  const s = props.stats.stats;
  return [
    { label: '总游戏数', value: s.total_games },
    { label: '胜利次数', value: s.wins },
    { label: '胜率', value: (s.win_rate*100).toFixed(1)+'%' },
    { label: '最高分', value: s.best_score },
    { label: '平均分', value: s.avg_score },
    { label: '平均时长(s)', value: Math.floor(s.avg_duration) }
  ];
});
</script>
<style scoped>
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:2000;}
.modal{background:#fff;border-radius:12px;max-width:640px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #eee;}
.close{background:none;border:none;font-size:24px;cursor:pointer;}
.modal-body{padding:20px;}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:16px;}
.stat{background:#f8f9fa;border-radius:8px;padding:12px 10px;text-align:center;}
.value{font-size:20px;font-weight:700;color:#667eea;margin-bottom:4px;}
.label{font-size:12px;color:#666;}
</style>
