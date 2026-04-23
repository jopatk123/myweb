import { ref } from 'vue';

export const appsState = {
  apps: ref([]),
  groups: ref([]),
  loading: ref(false),
  error: ref(''),
  lastError: ref(null),
  page: ref(1),
  limit: ref(20),
  total: ref(0),
};

export function resetAppsState() {
  appsState.apps.value = [];
  appsState.groups.value = [];
  appsState.loading.value = false;
  appsState.error.value = '';
  appsState.lastError.value = null;
  appsState.page.value = 1;
  appsState.limit.value = 20;
  appsState.total.value = 0;
}
