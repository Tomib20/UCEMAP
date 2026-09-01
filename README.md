<div align="center">

<img src="public/pwa-192x192.png" width="96" alt="UCEMA Map">

# UCEMA Map

**Mapa interactivo de correlatividades de las carreras de la Universidad del CEMA.**

Marcá las materias que aprobaste y mirá al toque qué se te habilita, qué te falta y cómo venís con el promedio.

### [→ Abrir UCEMA Map](https://ucemap.vercel.app)

</div>

---

## Qué hace

- **Grafo de correlatividades** por año, con las electivas y talleres aparte.
- **"¿Qué puedo cursar?"** — ilumina solo las materias que ya podés anotarte.
- **Progreso y promedio** en vivo, con notas por materia (incluida "AP").
- **Buscador** con Ctrl/Cmd + K, modo oscuro y export del mapa a PNG.
- **Se instala como app** en el celular y funciona sin conexión.
- **Sesión con Google opcional**: tu progreso se guarda en tu propio Drive, en una carpeta privada que solo esta app puede ver. Sin sesión, la app anda igual y nada sale de tu navegador.

## Carreras

Las 12 carreras de grado, con sus planes vigentes:

| | |
|---|---|
| Ingeniería en Informática | Licenciatura en Economía |
| Abogacía | Licenciatura en Finanzas |
| Actuario | Licenciatura en Marketing |
| Business Administration | Licenciatura en Negocios Digitales |
| Contador Público | Licenciatura en Relaciones Internacionales |
| Licenciatura en Ciencias Políticas | Licenciatura en Dirección de Empresas |

> Los datos se transcriben de los planes de estudio oficiales, pero **pueden tener errores**.
> Si ves uno, el panel de cada materia tiene un link para reportarlo. Antes de inscribirte,
> confirmá siempre con la universidad.

## Stack

React 19 · TypeScript · Vite · [React Flow](https://reactflow.dev) para el grafo · Zustand · Tailwind CSS v4 · React Router.

No hay backend: el progreso se sincroniza contra el Google Drive del propio usuario (`appDataFolder`), y los planes de estudio son JSON estáticos servidos con la app.

## Correr el proyecto

```bash
npm install
npm run dev
```

Para probar el login con Google, copiá `.env.example` a `.env` y completá `VITE_GOOGLE_CLIENT_ID` con un OAuth Client ID propio. Sin esa variable la app funciona igual, pero solo en local.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run validate` | Valida los JSON de carreras (correlativas, ciclos, cupos) |
| `npm run build` | Valida, type-checkea y buildea a `dist/` |

## Agregar o corregir una carrera

1. El PDF del plan va en `docs/planes-de-estudio/`.
2. Se genera el JSON con `python scripts/generate_carreras.py` (ver [scripts/README.md](scripts/README.md)).
3. Se registra en `data/carreras/index.json`.
4. `npm run validate` — falla el build si hay correlativas rotas, ciclos o cupos imposibles.

Las correcciones de datos son bienvenidas: si conocés bien el plan de tu carrera y ves algo mal, abrí un issue o mandá un PR.

---

<div align="center">

Hecho por [Tomás Bruner](https://github.com/Tomib20), alumno de Ingeniería en Informática.

Proyecto no oficial, sin relación con la Universidad del CEMA ·
[Privacidad](https://ucemap.vercel.app/privacidad) ·
[Condiciones](https://ucemap.vercel.app/terminos)

</div>
