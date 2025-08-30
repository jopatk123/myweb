/**
 * Canvas 渲染工具类
 * 将复杂的绘制逻辑从组件中分离出来
 */

export class CanvasRenderer {
  constructor(ctx, boardSize, cell) {
    this.ctx = ctx;
    this.boardSize = boardSize;
    this.cell = cell;
  }

  /**
   * 清空画布并绘制背景
   */
  clearCanvas() {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.boardSize, this.boardSize);
  }

  /**
   * 绘制网格
   */
  drawGrid(gridSize) {
    this.ctx.strokeStyle = '#2a2a2a';
    this.ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= gridSize; i++) {
      // 垂直线
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.cell, 0);
      this.ctx.lineTo(i * this.cell, this.boardSize);
      this.ctx.stroke();
      
      // 水平线
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.cell);
      this.ctx.lineTo(this.boardSize, i * this.cell);
      this.ctx.stroke();
    }
  }

  /**
   * 绘制粒子效果
   */
  drawParticles(particles) {
    particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.life;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  /**
   * 绘制单条蛇
   */
  drawSingleSnake(body, colorBase = '#4ade80', highlight = false) {
    body.forEach((segment, index) => {
      const x = segment.x * this.cell;
      const y = segment.y * this.cell;
      
      if (index === 0) {
        // 绘制蛇头
        this._drawSnakeHead(x, y, colorBase, highlight);
      } else {
        // 绘制蛇身
        this._drawSnakeBody(x, y, index, colorBase, highlight);
      }
    });
  }

  /**
   * 绘制蛇头
   */
  _drawSnakeHead(x, y, colorBase, highlight) {
    // 头部主体
    this.ctx.fillStyle = highlight ? '#ffffff' : colorBase;
    this.ctx.fillRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
    
    // 眼睛
    this.ctx.fillStyle = highlight ? colorBase : '#000';
    this.ctx.fillRect(x + 5, y + 5, 3, 3);
    this.ctx.fillRect(x + 12, y + 5, 3, 3);
  }

  /**
   * 绘制蛇身
   */
  _drawSnakeBody(x, y, index, colorBase, highlight) {
    this.ctx.fillStyle = highlight ? '#ffffff' : colorBase;
    this.ctx.globalAlpha = Math.max(0.35, 1 - index * 0.06);
    this.ctx.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
    this.ctx.globalAlpha = 1;
    
    // 高亮模式下在第二节加彩色条纹
    if (highlight && index === 1) {
      this.ctx.fillStyle = colorBase;
      this.ctx.fillRect(x + 3, y + 3, this.cell - 6, 4);
    }
  }

  /**
   * 绘制多条蛇（多人模式）
   */
  drawMultipleSnakes(snakes, activeSessionId) {
    const defaultColors = ['#4ade80', '#60a5fa', '#f472b6', '#facc15'];
    
    Object.values(snakes).forEach((snake, idx) => {
      const color = snake.player?.player_color || defaultColors[idx % 4];
      const highlight = activeSessionId && snake.player?.session_id === activeSessionId;
      this.drawSingleSnake(snake.body || [], color, highlight);
    });
  }

  /**
   * 绘制食物
   */
  drawFood(food, altIndex = 0) {
    const x = food.x * this.cell;
    const y = food.y * this.cell;
    
    const palette = [
      ['#ff6b6b', '#ff4757'],
      ['#7c3aed', '#6d28d9'],
      ['#0ea5e9', '#0284c7'],
      ['#f59e0b', '#d97706']
    ];
    
    const [outer, inner] = palette[altIndex % palette.length];
    
    // 外层发光效果
    this.ctx.shadowColor = outer;
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = outer;
    this.ctx.fillRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
    
    // 内层
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = inner;
    this.ctx.fillRect(x + 4, y + 4, this.cell - 8, this.cell - 8);
  }

  /**
   * 绘制多个食物
   */
  drawMultipleFoods(foods) {
    foods.forEach((food, index) => {
      this.drawFood(food, index);
    });
  }

  /**
   * 绘制特殊食物
   */
  drawSpecialFood(specialFood) {
    if (!specialFood) return;
    
    const x = specialFood.x * this.cell;
    const y = specialFood.y * this.cell;
    const time = Date.now() * 0.01;
    const alpha = 0.5 + 0.5 * Math.sin(time);
    
    // 闪烁效果
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
    this.ctx.shadowBlur = 0;
    this.ctx.restore();
    
    // 星星符号
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('★', x + this.cell / 2, y + this.cell / 2 + 4);
  }
}