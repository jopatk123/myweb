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
