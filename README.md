# ALCPT y ALC por parciales (v2.4)
PWA para la Mesa de Inglés de la Esc. Mil. Enfría.

- **ALC · Evaluación Parcial 1 y 2** (cada parcial = un libro), además de evaluación semestral, por libro (Books 3–18) y por lección.
- **ALCPT**: por semestre, por parcial (con opción acumulativa) y por forma.
- **Final ALCPT**: carga formas (JSON o CSV con clave) y audios mp3/m4a (pista completa o por reactivo) guardados en el dispositivo; los reproduce en examen, califica con tablas de conversión e imprime cuadernillo y clave.
- Libros según el Plan de estudios 2026-2027 (2 libros por semestre, un libro por parcial).

Se publica **vacía**: el banco, las formas y los audios son confidenciales y se importan en cada dispositivo (archivos JSON). Se guardan en IndexedDB y no salen del dispositivo. Este repositorio no contiene reactivos.

No afiliada al DLIELC.

## v2.4 · Examen final con formas originales en PDF y audio MP3
- En **Examen final** se agrega la forma original como **PDF** (se guarda solo en el dispositivo, IndexedDB) y se ve dentro de la app (visor pdf.js local, con zoom).
- Audio **MP3** (o m4a): pista completa y/o por reactivo (2 escuchas por reactivo en examen).
- **Hoja de respuestas** A–D por reactivo; **clave opcional** (texto o CSV `n,clave`). Sin clave, las hojas quedan pendientes y se califican al capturarla. Calificación con las tablas de conversión.
- Se conserva la carga de formas como datos (JSON/CSV).
- Visor: pdf.js 4.10.38 (Mozilla, Apache-2.0) en `pdfjs/`.
