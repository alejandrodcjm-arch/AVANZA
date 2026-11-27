export const metadata = { title: "Sin escuela" };

export default function NoSchool() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Su cuenta todavía no está ligada a una escuela</h1>
      <p className="mt-2 text-muted">
        Si es mamá, papá o tutor, abra el enlace de invitación que le llegó por correo. Si es parte del personal, pida a dirección que le dé acceso.
      </p>
      <form action="/salir" method="post" className="mt-6">
        <button className="font-semibold text-brand underline">Salir</button>
      </form>
    </main>
  );
}
