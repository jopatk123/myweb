import { ref } from 'vue';

export const windowManagerState = {
  windows: ref([]),
  activeWindowId: ref(null),
  nextWindowId: ref(1),
  baseZIndex: ref(1000),
};

export function resetWindowManagerState() {
  windowManagerState.windows.value = [];
  windowManagerState.activeWindowId.value = null;
  windowManagerState.nextWindowId.value = 1;
  windowManagerState.baseZIndex.value = 1000;
}
