"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-2 text-muted">No se perdió nada de lo que ya guardó. Intente de nuevo; si sigue pasando, avise a la escuela.</p>
      <button onClick={reset} className="mx-auto mt-6 min-h-12 rounded-xl bg-brand px-6 font-semibold text-white">
        Intentar de nuevo
      </button>
    </main>
  );
}
