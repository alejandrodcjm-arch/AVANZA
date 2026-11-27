"use client";

import { useOffline } from "next/offline";

/** En el salón el internet falla: se avisa y lo pendiente se envía solo al volver la señal. */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-care px-4 py-2 text-center text-sm font-medium text-white">
      Sin conexión. Lo que guarde se enviará en cuanto regrese la señal.
    </div>
  );
}
