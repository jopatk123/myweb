<template>
  <div class="admin-layout" :class="{ 'sider-visible': siderVisible }">
    <button
      v-if="!siderVisible"
      class="global-sider-toggle"
      type="button"
      title="显示侧边栏"
      aria-label="打开管理后台导航"
      @click="setSiderVisible(true)"
    >
      ☰
    </button>

    <div
      v-if="siderVisible"
      class="global-sider-overlay"
      aria-hidden="true"
      @click="setSiderVisible(false)"
    />

    <aside class="global-sider" :aria-hidden="!siderVisible">
      <div class="global-sider-header">
        <div class="brand">管理后台</div>
        <button
          class="global-sider-close"
          type="button"
          aria-label="关闭管理后台导航"
          @click="setSiderVisible(false)"
        >
          ×
        </button>
      </div>
      <nav class="global-menu" aria-label="管理后台导航">
        <router-link
          to="/wallpapers"
          class="menu-item"
          :class="{ active: route.name === 'WallpaperManagement' }"
          @click="closeSidebarOnNavigate"
        >
          壁纸管理
        </router-link>
        <router-link
          to="/apps"
          class="menu-item"
          :class="{ active: route.name === 'AppManagement' }"
          @click="closeSidebarOnNavigate"
        >
          应用管理
        </router-link>
        <router-link
          to="/files"
          class="menu-item"
          :class="{ active: route.name === 'FileManagement' }"
          @click="closeSidebarOnNavigate"
        >
          文件管理
        </router-link>
      </nav>
    </aside>

    <slot name="module-sider" />

    <main class="content-area">
      <slot />
    </main>
  </div>
</template>

<script setup>
  import { useRoute } from 'vue-router';

  defineProps({
    siderVisible: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['update:siderVisible']);
  const route = useRoute();

  function setSiderVisible(value) {
    emit('update:siderVisible', value);
  }

  function closeSidebarOnNavigate() {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(max-width: 1024px)').matches
    ) {
      setSiderVisible(false);
    }
  }
</script>
