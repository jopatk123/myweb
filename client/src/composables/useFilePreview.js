import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * 简单的浏览器端文件预览组合函数
 * 支持：.docx -> HTML / text, .xlsx -> HTML table, 纯文本文件 -> text
 */
export function useFilePreview() {
  const previewDocx = async file => {
    if (!file) return '';
    const arrayBuffer = await file.arrayBuffer();
    // mammoth.convertToHtml 在浏览器环境可用
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || '';
  };

  const extractTextFromDocx = async file => {
    if (!file) return '';
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  };

  const previewXlsx = async (file, sheetIndex = 0) => {
    if (!file) return '';
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = wb.SheetNames[sheetIndex] || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return '';
    // 转为 HTML
    const html = XLSX.utils.sheet_to_html(sheet);
    return html;
  };

  const previewGenericText = async file => {
    if (!file) return '';
    try {
      return await file.text();
    } catch {
      return '';
    }
  };

  return {
    previewDocx,
    extractTextFromDocx,
    previewXlsx,
    previewGenericText,
  };
}
