export const metadata = { title: "Sin conexión" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="mt-2 text-muted">Revise su internet. En cuanto regrese la señal, vuelva a abrir Avanza.</p>
    </main>
  );
}
