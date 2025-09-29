#!/usr/bin/env node

/**
 * Docker 容器健康检查脚本
 * 健康时返回退出码 0，不健康时返回退出码 1
 */

import http from 'http';

const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_TIMEOUT = 5000;

function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: HEALTH_CHECK_TIMEOUT
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve('健康检查通过');
      } else {
        reject(new Error(`健康检查失败，状态码: ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(new Error(`健康检查请求失败: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('健康检查超时'));
    });

    req.end();
  });
}

// 运行健康检查
healthCheck()
  .then((message) => {
    console.log(message);
    process.exit(0);
  })
  .catch((error) => {
    console.error('健康检查失败:', error.message);
    process.exit(1);
  });