import { onMounted } from 'vue';
import { useApps } from '@/composables/useApps.js';
import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
import { useWindowManager } from '@/composables/useWindowManager.js';

// 单个自启动应用的启动逻辑。每个应用隔离在独立 try/catch 内，
// 任一应用启动失败不会中断后续应用的启动。
function startOneAutostartApp(app, ctx) {
  const { createWindow, findWindowByApp, setActiveWindow } = ctx;

  const url = app.targetUrl;
  if (url) {
    // 注意：浏览器通常会在缺乏用户手势时拦截 window.open，
    // 这里仅尽力尝试；若被拦截，会进入 catch 后继续启动后续应用。
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('[AutostartApps] open autostart url failed', {
        slug: app.slug,
        error: e?.message || String(e),
      });
    }
    return;
  }

  const existing = findWindowByApp(app.slug);
  if (existing) {
    existing.props = existing.props || {};
    if (app.slug === 'work-timer') existing.props.autoStart = true;
    setActiveWindow(existing.id);
    return;
  }

  const comp = getAppComponentBySlug(app.slug);
  const meta = getAppMetaBySlug(app.slug);
  if (!comp) {
    console.warn('[AutostartApps] autostart app has no component', {
      slug: app.slug,
    });
    return;
  }
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

export default function useAutostartApps() {
  const wm = useWindowManager();
  const { fetchAppsList } = useApps();

  async function startAutostartApps() {
    let list;
    try {
      list = await fetchAppsList({ visible: true });
    } catch (e) {
      console.warn('[AutostartApps] fetch autostart apps failed', {
        error: e?.message || String(e),
      });
      return;
    }

    const autostartApps = list.filter(
      a => a.isAutostart === 1 || a.isAutostart === true
    );
    if (autostartApps.length === 0) return;

    // 用 microtask 延迟，避免阻塞首次渲染；不引入任意 120ms setTimeout。
    // 每个应用独立 try/catch，单个失败不影响其它应用启动。
    Promise.resolve().then(() => {
      for (const app of autostartApps) {
        try {
          startOneAutostartApp(app, wm);
        } catch (e) {
          console.warn('[AutostartApps] start autostart app failed', {
            slug: app.slug,
            error: e?.message || String(e),
          });
        }
      }
    });
  }

  onMounted(() => {
    // 主动触发一次启动流程
    void startAutostartApps();
  });

  return {
    startAutostartApps,
  };
}
