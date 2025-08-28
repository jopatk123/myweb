import { onMounted } from 'vue';
import { useApps } from '@/composables/useApps.js';
import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
import { useWindowManager } from '@/composables/useWindowManager.js';

export default function useAutostartApps() {
  const { createWindow, findWindowByApp, setActiveWindow } = useWindowManager();

  async function startAutostartApps() {
    try {
      const { fetchApps, apps } = useApps();
      await fetchApps({ visible: true }, false);
      const list = Array.isArray(apps.value) ? apps.value : [];
      const autostartApps = list.filter(
        a =>
          (a.isAutostart ?? a.is_autostart) === 1 ||
          (a.isAutostart ?? a.is_autostart) === true
      );

      // 延迟执行，避免阻塞首次渲染
      setTimeout(() => {
        for (const app of autostartApps) {
          const url = app.targetUrl || app.target_url;
          if (url) {
            try {
              window.open(url, '_blank');
            } catch (e) {
              console.warn('open autostart url failed', e);
            }
            continue;
          }

          const existing = findWindowByApp(app.slug);
          if (existing) {
            existing.props = existing.props || {};
            if (app.slug === 'work-timer') existing.props.autoStart = true;
            setActiveWindow(existing.id);
            continue;
          }

          const comp = getAppComponentBySlug(app.slug);
          const meta = getAppMetaBySlug(app.slug);
          if (comp) {
            const preferred = meta?.preferredSize || { width: 520, height: 400 };
            createWindow({
              component: comp,
              title: meta?.name || app.name || '',
              appSlug: app.slug,
              width: preferred.width,
              height: preferred.height,
              props: app.slug === 'work-timer' ? { autoStart: true } : {},
            });
          }
        }
      }, 120);
    } catch (e) {
      console.warn('startAutostartApps error', e);
    }
  }

  onMounted(() => {
    // 主动触发一次启动流程
    startAutostartApps().catch(() => {});
  });

  return {
    startAutostartApps,
  };
}


