import { onBeforeUnmount, onMounted, Ref, ref } from "vue";
import { getCssVariableValue, isLightOrDark } from '../utils/index';

const colorTheme: Ref<string> = ref('dark');
let intervalId: number | undefined;

const editorBackground = '--vscode-editor-background';
let lastValue = getCssVariableValue(editorBackground);
export function useTheme(domRef: Ref<HTMLDivElement | null>) {
  function checkCssVariableChanges() {
    const currentValue = getCssVariableValue(editorBackground);
    if (currentValue !== lastValue) {
      lastValue = currentValue;
      if (domRef.value) {
        colorTheme.value = isLightOrDark(lastValue);
      }
    }
  }
  onMounted(() => {
    intervalId = window.setInterval(() => {
      checkCssVariableChanges();
    }, 1000); // 每隔1秒检查一次
  });

  onBeforeUnmount(() => {
    // 清除定时器
    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
  });

  return {
    colorTheme
  };
}