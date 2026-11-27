import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-muted">Puede que el enlace sea viejo o que no tenga acceso a esta información.</p>
      <Link href="/inicio" className="mt-6 font-semibold text-brand underline">
        Ir al inicio
      </Link>
    </main>
  );
}
