// AI提示词管理组合式函数
import { ref, computed } from 'vue';
import { aiPromptService } from '../services/AIPromptService.js';

export function useAIPrompts() {
  // 当前选中的提示词模板
  const selectedTemplate = ref('gomoku-system');

  // 获取所有提示词模板列表
  const templateList = computed(() => aiPromptService.getTemplateList());

  // 获取所有提示词模板
  const allTemplates = computed(() => aiPromptService.getAllTemplates());

  // 获取提示词模板对象
  const promptTemplates = computed(() => aiPromptService.promptTemplates);

  // 获取系统提示词
  function getSystemPrompt(templateId = selectedTemplate.value) {
    return aiPromptService.getSystemPrompt(templateId);
  }

  // 构建游戏状态提示词
  function buildGamePrompt(templateId, gameData) {
    try {
      return aiPromptService.buildGamePrompt(templateId, gameData);
    } catch (error) {
      console.error('构建游戏提示词失败:', error);
      return '';
    }
  }

  // 解析AI回复
  function parseAIResponse(response, gameType = 'gomoku') {
    try {
      return aiPromptService.parseAIResponse(response, gameType);
    } catch (error) {
      console.error('解析AI回复失败:', error);
      throw error;
    }
  }

  // 获取提示词模板信息
  function getTemplateInfo(templateId) {
    return aiPromptService.getTemplateById(templateId);
  }

  // 验证提示词模板是否存在
  function hasTemplate(templateId) {
    return !!aiPromptService.getTemplateById(templateId);
  }

  // 添加自定义提示词模板
  function addCustomTemplate(template) {
    try {
      aiPromptService.addCustomTemplate(template);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 移除提示词模板
  function removeTemplate(templateId) {
    aiPromptService.removeTemplate(templateId);
    if (selectedTemplate.value === templateId) {
      selectedTemplate.value = 'gomoku-system'; // 重置为默认模板
    }
  }

  // 重置选中状态
  function resetSelection() {
    selectedTemplate.value = 'gomoku-system';
  }

  // 构建完整的AI请求消息
  function buildAIMessages(templateId, gameData) {
    const systemPrompt = getSystemPrompt(templateId);
    const gamePrompt = buildGamePrompt(templateId, gameData);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: gamePrompt },
    ];
  }

  // 构建OpenAI格式的请求载荷
  function buildOpenAIPayload(templateId, gameData, config) {
    const messages = buildAIMessages(templateId, gameData);

    return {
      model: config.modelName || 'deepseek-chat',
      messages: messages,
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.1,
    };
  }

  // 构建Claude格式的请求载荷
  function buildClaudePayload(templateId, gameData, config) {
    const messages = buildAIMessages(templateId, gameData);

    return {
      model: config.modelName || 'claude-3-sonnet-20240229',
      messages: messages,
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.1,
    };
  }

  // 根据API类型构建请求载荷
  function buildRequestPayload(templateId, gameData, config) {
    const apiUrl = config.apiUrl || '';

    if (apiUrl.includes('anthropic.com')) {
      return buildClaudePayload(templateId, gameData, config);
    } else {
      return buildOpenAIPayload(templateId, gameData, config);
    }
  }

  return {
    // 状态
    selectedTemplate,
    templateList,
    allTemplates,
    promptTemplates,

    // 方法
    getSystemPrompt,
    buildGamePrompt,
    parseAIResponse,
    getTemplateInfo,
    hasTemplate,
    addCustomTemplate,
    removeTemplate,
    resetSelection,
    buildAIMessages,
    buildRequestPayload,
  };
}
