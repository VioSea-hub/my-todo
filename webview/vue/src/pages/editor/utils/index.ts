// 将十六进制颜色转换为 RGB 颜色
export function hexToRgb(hex: string) {
  // 移除前面的 #
  hex = hex.replace(/^#/, '');

  // 将3位十六进制颜色转换为6位
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

// 计算颜色亮度
export function getBrightness(rgb: number[]) {
  const [r, g, b] = rgb;
  // 使用感知亮度公式计算亮度
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// 判断颜色是亮色还是暗色
export function isLightOrDark(color: string) {
  const rgb = hexToRgb(color); 
  const brightness = getBrightness(rgb);
  return brightness > 128 ? 'light' : 'dark';
} 

// 获取 CSS 变量的值
export function getCssVariableValue(variableName: string):string {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

// 格式化日期
export function formatDate(timestamp: number | null, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  if (timestamp === null) {
    return '';
  }
  const date = new Date(timestamp);
  const map: { [key: string]: string } = {
    'yyyy': date.getFullYear().toString(),
    'MM': ('0' + (date.getMonth() + 1)).slice(-2),
    'dd': ('0' + date.getDate()).slice(-2),
    'HH': ('0' + date.getHours()).slice(-2),
    'mm': ('0' + date.getMinutes()).slice(-2),
    'ss': ('0' + date.getSeconds()).slice(-2),
  };

  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (matched) => map[matched]);
}