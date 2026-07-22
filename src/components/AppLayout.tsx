import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

type IdleBrowserWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const scheduleIdleTask = (callback: () => void) => {
  const idleWindow = window as IdleBrowserWindow;

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1800 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 900);
  return () => window.clearTimeout(handle);
};

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const ModuleFallback = () => (
  <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
    <LoaderCircle className="h-4 w-4 animate-spin" />
    Carregando...
  </div>
);

const AppLayout = () => {
  const queryClient = useQueryClient();
  const { hasPermission, usuario, usuarioLoading } = useAuth();
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  useEffect(() => {
    if (!usuario?.id || usuarioLoading) return;

    let cancelled = false;
    const cancelIdleTask = scheduleIdleTask(() => {
      void (async () => {
        for (let attempt = 0; attempt < 24 && !cancelled; attempt += 1) {
          if (!queryClient.isFetching({ queryKey: ["dashboard-operacional"] })) {
            break;
          }
          await wait(250);
        }

        if (cancelled) return;
        setIsBackgroundSyncing(true);

        try {
          const { sincronizarDadosSessao } = await import(
            "@/services/backgroundSyncService"
          );
          await sincronizarDadosSessao({
            queryClient,
            hasPermission,
            shouldContinue: () => !cancelled,
          });
        } catch (error) {
          console.warn("Falha ao iniciar sincronizacao em segundo plano:", error);
        } finally {
          if (!cancelled) {
            setIsBackgroundSyncing(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelIdleTask();
    };
  }, [hasPermission, queryClient, usuario?.id, usuarioLoading]);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden">
      <AppSidebar />
      <main className="relative h-full min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {isBackgroundSyncing && (
          <div
            className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Sincronizando dados...
          </div>
        )}
        <div className="min-h-full w-full">
          <Suspense fallback={<ModuleFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
