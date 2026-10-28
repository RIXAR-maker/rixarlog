# RIXARLOG

Libro de vuelo electrónico EASA (AMC1 FCL.050). App web instalable (PC, iPhone, Android) con cuentas de usuario, sincronización en tiempo real e historial de cambios inalterable.

## Funciones (v1.0)
- Cuentas con email y contraseña; cada piloto solo ve sus datos (Row Level Security).
- Registro de vuelos y sesiones FSTD con las columnas de AMC1 FCL.050.
- Automático: tiempo total desde OFF/ON, clase desde la matrícula, función, IFR, noche (sol < −6°, ruta por círculo máximo) y aterrizajes y despegues de día o de noche.
- Controles cruzados en cada anotación.
- Panel: totales, hitos, gráficos, recencia FCL.060 por tipo y caducidades con semáforo.
- Totales por periodo (28 días, 90 días, 12 meses y año en curso), por tipo y por año.
- Informe para procesos de selección (texto y PDF) y estadísticas de rutas, aeropuertos, matrículas y comandantes.
- Historial de cada alta, edición y borrado (triggers en el servidor).
- Exportación: PDF EASA con totales por página, Excel, CSV en bruto y copia JSON.
- Importación: CSV con asignación de columnas y restauración de la copia JSON.
- Temas: Cabina oscura (ECAM), Manual técnico (FCOM) e Híbrido. Idiomas: ES/EN. Funciona sin conexión.

## Arquitectura
- Frontend estático (HTML/CSS/JS sin compilación) con las librerías en `vendor/`: supabase-js 2.45.4, Chart.js 4.4.1, jsPDF 2.5.1, jspdf-autotable 3.8.2 y SheetJS 0.18.5.
- Backend: Supabase, proyecto `RIXARLOG` (eu-west-1, Irlanda). Tablas: `profiles`, `entries`, `aircraft`, `documents` y `audit_log`.
- Aeropuertos: `airports.json`, generado a partir de OurAirports (dominio público) con unos 19.000 códigos ICAO.
- Tipografía: B612, la fuente open source (OFL) diseñada para pantallas de cabina.

## Publicar
1. Sube esta carpeta a un hosting estático con https: GitHub Pages, Netlify o Vercel.
2. En Supabase → Authentication → URL Configuration:
   - **Site URL** = la URL publicada (por ejemplo, `https://usuario.github.io/rixarlog/`).
   - Añade la misma URL en **Redirect URLs**.

## Aviso
RIXARLOG no está afiliado a Airbus ni a EASA. El registro legal de las horas de vuelo es responsabilidad de cada piloto.
