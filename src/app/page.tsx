import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { BannerUrgente } from "@/components/portada/banner-urgente";
import { HeroVideo } from "@/components/portada/hero-video";
import { Revelar } from "@/components/portada/revelar";
import { RegistrarPwa } from "@/components/portada/registrar-pwa";
import { obtenerBanner } from "@/lib/actions/banner";
import { MODULOS_CARRERA } from "@/lib/guards";

export const dynamic = "force-dynamic";

const competencias = [
  {
    nombre: "Cadena de suministro",
    imagen: "/images/competencia-cadena-suministro.jpg",
    texto: "Planeación integral del flujo de materiales, información y recursos desde el proveedor hasta el cliente final.",
  },
  {
    nombre: "Almacenes e inventarios",
    imagen: "/images/competencia-almacen.jpg",
    texto: "Recepción, acomodo, picking, conteo cíclico y control de existencias con métodos PEPS, UEPS y ABC.",
  },
  {
    nombre: "Transporte y distribución",
    imagen: "/images/competencia-transporte.jpg",
    texto: "Selección de modos de transporte, diseño de rutas, consolidación de carga y última milla.",
  },
  {
    nombre: "Compras y abastecimiento",
    imagen: "/images/competencia-compras.jpg",
    texto: "Evaluación de proveedores, órdenes de compra, negociación y punto de reorden.",
  },
  {
    nombre: "Comercio exterior",
    imagen: "/images/competencia-comercio-exterior.jpg",
    texto: "INCOTERMS, pedimentos, regímenes aduaneros y documentación de importación y exportación.",
  },
  {
    nombre: "Logística sustentable",
    imagen: "/images/competencia-sustentable.jpg",
    texto: "Logística inversa, manejo de devoluciones, empaque responsable e indicadores KPI.",
  },
];

const salidas = [
  "Auxiliar de almacén y control de inventarios",
  "Asistente de tráfico y distribución",
  "Auxiliar de compras y abastecimiento",
  "Auxiliar de agencia aduanal",
  "Coordinador junior de última milla",
  "Analista de indicadores logísticos",
];



export default async function HomePage() {
  const banner = await obtenerBanner();

  return (
    <>
      {banner?.activo ? (
        <BannerUrgente
          titulo={banner.titulo}
          mensaje={banner.mensaje}
          nivel={banner.nivel}
          enlace={banner.enlace}
          claveVersion={String(banner.updatedAt?.getTime() ?? banner.id)}
        />
      ) : null}

      <SiteHeader />

      <main>
        {/* HERO CON VIDEO */}
        <section className="relative isolate overflow-hidden">
          <HeroVideo />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0f2c4c]/80 via-[#17295a]/65 to-[#0f2c4c]/85"
            aria-hidden
          />

          <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20 md:py-28">
            <Revelar>
              <span className="inline-flex items-center gap-2 rounded-full border border-inst-300/50 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200 backdrop-blur sm:text-xs">
                Carrera técnica en Logística
              </span>
            </Revelar>
            <Revelar retraso={100}>
              <h1 className="mt-5 text-3xl font-black leading-tight text-white drop-shadow sm:mt-6 sm:text-4xl md:text-6xl">
                Plataforma de <span className="text-sky-200">Logística</span>
                <span className="mt-1 block text-xl font-bold text-inst-100 sm:text-2xl md:text-3xl">
                  CBTIS No. 270
                </span>
              </h1>
            </Revelar>
            <Revelar retraso={200}>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-inst-100/90 sm:mt-6 sm:text-base">
                Espacio de trabajo exclusivo para la carrera de Logística: clases de cadena de
                suministro, prácticas de almacén, control de inventarios, ruteo de transporte y
                comercio exterior. Todo en un mismo lugar, desde el aula o desde casa.
              </p>
            </Revelar>
            <Revelar retraso={300}>
              <div className="mt-7 flex flex-wrap justify-center gap-3 sm:mt-9">
                <Link href="/login" className="btn-oro px-6 py-3">
                  Entrar a la plataforma
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Registro de alumnos
                </Link>
              </div>
              <p className="mt-5 text-xs text-inst-100/70 sm:mt-6">
                Ingresa con tu correo registrado y tu código OTP de verificación.
              </p>
            </Revelar>
          </div>
        </section>

        {/* PLAN DE ESTUDIOS */}
        <section id="modulos" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <Revelar>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                Plan de estudios DGETI
              </p>
              <h2 className="mt-2 text-2xl font-black text-white drop-shadow sm:text-3xl">
                Módulos profesionales de Logística
              </h2>
              <p className="mt-3 text-sm text-inst-100/85 sm:text-base">
                La carrera se cursa de segundo a sexto semestre con cinco módulos profesionales,
                cada uno dividido en submódulos que se habilitan como aulas en la plataforma.
              </p>
            </div>
          </Revelar>

          <div className="mt-8 grid gap-5 sm:mt-10 md:grid-cols-2">
            {MODULOS_CARRERA.map((modulo, i) => (
              <Revelar key={modulo.modulo} retraso={i * 80}>
                <article className="tarjeta-azul h-full rounded-2xl p-6 text-white transition hover:bg-white/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/30">
                      {modulo.modulo}
                    </span>
                    <span className="text-xs font-semibold text-sky-100/80">
                      {modulo.semestre}° semestre
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{modulo.nombre}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {modulo.submodulos.map((sub) => (
                      <li key={sub} className="flex items-start gap-2 text-sm text-sky-50/90">
                        <span className="mt-0.5 text-sky-200">▸</span>
                        {sub}
                      </li>
                    ))}
                  </ul>
                </article>
              </Revelar>
            ))}
          </div>
        </section>

        {/* COMPETENCIAS */}
        <section id="competencias" className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
          <Revelar>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                Competencias profesionales
              </p>
              <h2 className="mt-2 text-2xl font-black text-white drop-shadow sm:text-3xl">
                Lo que aprende el técnico en Logística
              </h2>
            </div>
          </Revelar>

          <div className="mt-8 grid gap-5 sm:mt-10 md:grid-cols-2 lg:grid-cols-3">
            {competencias.map((c, i) => (
              <Revelar key={c.nombre} retraso={i * 80}>
                <article className="tarjeta-azul h-full overflow-hidden rounded-2xl text-white transition hover:bg-white/20">
                  <div className="relative h-40 w-full overflow-hidden">
                    <Image
                      src={c.imagen}
                      alt={c.nombre}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f2c4c]/80 via-transparent to-transparent" />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white">{c.nombre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-sky-50/90">{c.texto}</p>
                  </div>
                </article>
              </Revelar>
            ))}
          </div>
        </section>

        {/* SALIDAS LABORALES */}
        <section id="campo" className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
            <Revelar>
              <div className="overflow-hidden rounded-3xl border border-white/25 shadow-2xl">
                <Image
                  src="/images/almacen.jpg"
                  alt="Almacén y centro de distribución"
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>
            </Revelar>
            <Revelar retraso={120}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                  Campo laboral
                </p>
                <h2 className="mt-2 text-2xl font-black text-white drop-shadow sm:text-3xl">
                  Dónde trabaja el egresado
                </h2>
                <p className="mt-3 text-sm text-inst-100/85 sm:text-base">
                  Al concluir el bachillerato obtienes certificado de bachiller y título de{" "}
                  <strong className="text-white">Técnico en Logística</strong>, con competencias
                  aplicables en centros de distribución, transportistas, agencias aduanales, comercio
                  y manufactura.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {salidas.map((salida) => (
                    <div
                      key={salida}
                      className="tarjeta-azul rounded-xl px-4 py-3 text-sm font-medium text-white"
                    >
                      <span aria-hidden className="mr-2 text-sky-200">
                        ●
                      </span>
                      {salida}
                    </div>
                  ))}
                </div>
              </div>
            </Revelar>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <Revelar>
            <div className="tarjeta-azul flex flex-col items-center gap-6 rounded-3xl px-6 py-12 text-center text-white sm:px-8 sm:py-14">
              <h2 className="max-w-2xl text-2xl font-black text-white sm:text-3xl">
                ¿Listo para iniciar tu clase de logística?
              </h2>
              <p className="max-w-xl text-sm text-sky-50/90">
                Docentes: habilita el aula de tu submódulo en menos de un minuto. Alumnos: inscríbete y
                consulta tus prácticas y evidencias pendientes.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/login" className="btn-oro px-6 py-3">
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center rounded-xl border border-white/35 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Crear cuenta de alumno
                </Link>
              </div>
            </div>
          </Revelar>
        </section>
      </main>

      <SiteFooter />
      <RegistrarPwa />
    </>
  );
}
