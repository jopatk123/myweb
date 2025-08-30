<template>
  <div class="gomoku-test-page">
    <div class="page-header">
      <h1>🤖 AI大模型五子棋</h1>
      <p>体验智能AI对战的乐趣</p>
    </div>
    
    <div class="game-wrapper">
      <GomokuApp />
    </div>
    
    <div class="instructions">
      <h3>🎮 使用说明</h3>
      <div class="instruction-grid">
        <div class="instruction-card">
          <div class="instruction-icon">⚙️</div>
          <h4>配置AI</h4>
          <p>点击"AI配置"按钮设置你的AI模型参数，支持OpenAI、Claude等</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">🎯</div>
          <h4>开始对战</h4>
          <p>选择人机对战或AI对AI模式，体验不同的游戏乐趣</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">🧠</div>
          <h4>AI思考</h4>
          <p>观看AI的思考过程，了解每一步棋的决策理由</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">📊</div>
          <h4>数据统计</h4>
          <p>查看胜率统计，追踪你的游戏进步</p>
        </div>
      </div>
    </div>

    <div class="features">
      <h3>✨ 系统特色</h3>
      <div class="feature-list">
        <div class="feature-item">
          <span class="feature-icon">🤖</span>
          <div class="feature-content">
            <h4>AI大模型驱动</h4>
            <p>采用最新的AI大模型技术，提供真正智能的对战体验</p>
          </div>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">🎮</span>
          <div class="feature-content">
            <h4>多种游戏模式</h4>
            <p>支持人机对战和AI对AI对战，满足不同需求</p>
          </div>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">🔧</span>
          <div class="feature-content">
            <h4>灵活配置</h4>
            <p>支持多种AI模型配置，可自定义API参数</p>
          </div>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">📱</span>
          <div class="feature-content">
            <h4>响应式设计</h4>
            <p>完美适配桌面和移动设备，随时随地畅玩</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import GomokuApp from '../apps/gomoku/GomokuApp.vue';
</script>

<style scoped>
.gomoku-test-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header p {
  color: #666;
  font-size: 1.1rem;
}

.game-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.instructions {
  max-width: 1200px;
  margin: 0 auto 40px;
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.instructions h3 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 1.5rem;
}

.instruction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.instruction-card {
  text-align: center;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: transform 0.3s ease;
}

.instruction-card:hover {
  transform: translateY(-5px);
}

.instruction-icon {
  font-size: 2rem;
  margin-bottom: 15px;
  display: block;
}

.instruction-card h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.instruction-card p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
  line-height: 1.4;
}

.features {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.features h3 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 1.5rem;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  border-radius: 12px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-content h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1rem;
}

.feature-content p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .gomoku-test-page {
    padding: 15px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .instructions, .features {
    padding: 20px;
  }
  
  .instruction-grid {
    grid-template-columns: 1fr;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
  
  .feature-item {
    flex-direction: column;
    text-align: center;
  }
}
</style>