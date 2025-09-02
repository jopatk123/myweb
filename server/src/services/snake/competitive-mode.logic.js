// 竞技模式核心逻辑
export function initCompetitivePlayers(service, roomId, players){
  const gameState = service.getGameState(roomId);
  if(!gameState) return; const size = service.SNAKE_CONFIG.BOARD_SIZE; gameState.snakes={};
  players.forEach((p,idx)=>{
    const startX = idx%2===0 ? Math.floor(size/4) : Math.floor(3*size/4);
    const startY = Math.floor(size/2);
    gameState.snakes[p.session_id]={
      body:[{x:startX,y:startY},{x:startX,y:startY+1},{x:startX,y:startY+2}],
      direction:'up',nextDirection:'up',score:0,gameOver:false,player:p
    };
  });
  gameState.foods = generateCompetitiveFoods(service, gameState);
}

export function generateCompetitiveFoods(service, gameState){
  const foods=[]; const bodies = Object.values(gameState.snakes).flatMap(s=>s.body);
  for(let i=0;i<Object.keys(gameState.snakes).length;i++){
    foods.push(service.generateRandomPosition(service.SNAKE_CONFIG.BOARD_SIZE,bodies));
  }
  return foods;
}

export function updateCompetitiveGameTick(service, roomId){
  const gameState = service.getGameState(roomId); if(!gameState) return; const size = service.SNAKE_CONFIG.BOARD_SIZE;
  // 更新房间时间戳避免被误判闲置
  try { service.RoomModel.update(roomId, { /* tick touch */ }); } catch (e) { console.warn('competitive tick touch failed', e); }
  let alive=0; let survivor=null;
  Object.entries(gameState.snakes).forEach(([sid,snake])=>{
    if(snake.gameOver) return;
    snake.direction = snake.nextDirection || snake.direction;
    const head={...snake.body[0]};
    switch(snake.direction){case 'up':head.y--;break;case 'down':head.y++;break;case 'left':head.x--;break;case 'right':head.x++;break;}
    if(head.x<0) head.x=size-1; else if(head.x>=size) head.x=0; if(head.y<0) head.y=size-1; else if(head.y>=size) head.y=0;
    if(snake.body.some(seg=>seg.x===head.x && seg.y===head.y)){ snake.gameOver=true; return; }
    Object.entries(gameState.snakes).forEach(([oid,other])=>{ if(oid===sid||other.gameOver) return; if(other.body.some(seg=>seg.x===head.x && seg.y===head.y)){ snake.gameOver=true; }});
    if(snake.gameOver) return;
    snake.body.unshift(head);
    let ate=false;
    gameState.foods.forEach((food,idx)=>{ if(!ate && head.x===food.x && head.y===food.y){ ate=true; snake.score+=10; const allBodies=Object.values(gameState.snakes).flatMap(s=>s.body); gameState.foods[idx]=service.generateRandomPosition(size,allBodies);} });
    if(!ate) snake.body.pop();
    if(!snake.gameOver){ alive++; survivor=snake.player; }
  });
  service.broadcastToRoom(roomId,'competitive_update',{game_state:gameState,snakes:gameState.snakes,foods:gameState.foods});
  if(alive<=1){ if(survivor){ gameState.winner=survivor; } service.endGame(roomId,'competitive_finished'); }
}
