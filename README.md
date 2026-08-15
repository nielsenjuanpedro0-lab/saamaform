# SAAMA — Ficha de admisión + Consultorio

Sitio estático sobre Supabase. Sin build, sin dependencias que instalar.

| Ruta | Qué es | Quién entra |
|---|---|---|
| `/` | Ficha de admisión que completa el paciente | Cualquiera con el link |
| `/admin` | Consultorio: tablero, fichas, agenda y reportes | Solo con usuario y contraseña |

## El consultorio

- **Consultorio** — indicadores del mes, próximas sesiones, fichas sin contactar y las sesiones de los últimos seis meses.
- **Fichas** — listado con búsqueda, ficha completa, estado, notas privadas, sesiones del paciente, impresión y borrado.
- **Agenda** — calendario mensual. Se agenda desde cualquier día, y cada sesión guarda duración, estado, arancel, si está paga y las notas de lo trabajado.
- **Reportes** — fichas y sesiones por mes, estados, ingresos, ranking de pacientes y exportación a CSV, todo sobre el período elegido.

Los aranceles son opcionales: si no se cargan, los bloques de dinero directamente no aparecen.

## Archivos

```
index.html               Formulario público
admin.html               Cáscara del panel: login, navegación y ruteo
app/config.js            URL y anon key de Supabase   ← lo único que hay que completar
app/db.js                Clientes de Supabase (público y panel)
app/ficha.js             Campos de la ficha y estados  ← fuente de verdad
app/formato.js           Fechas, calendario y formato
app/datos.js             Estado en memoria y acceso a datos
app/grafico.js           Gráficos SVG, sin librerías
app/vistas/tablero.js    Tablero
app/vistas/fichas.js     Fichas
app/vistas/agenda.js     Calendario
app/vistas/reportes.js   Reportes
app/vistas/editor-sesion.js  Alta y edición de sesiones
app/saama.css            Paleta y controles compartidos
app/panel.css            Estilos del panel
supabase/schema.sql      Tabla de fichas, permisos y RLS
supabase/002_sesiones.sql Tabla de sesiones
vercel.json              Rutas limpias y cabeceras
```

Para agregar o cambiar una pregunta de la ficha: tocá `app/ficha.js` y agregá la columna en `supabase/schema.sql`. El formulario, el panel y el CSV se actualizan solos.

## Puesta en marcha

### 1. Base de datos

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá `supabase/schema.sql` → **Run**.
3. **SQL Editor** → pegá `supabase/002_sesiones.sql` → **Run**. Sin esto el panel funciona igual, pero la agenda avisa que falta.
4. **Authentication → Users → Add user**: correo y contraseña de la terapeuta, con *Auto Confirm User* tildado.
5. **Authentication → Sign In / Providers → Email**: desactivá *Allow new users to sign up*. Sin esto, cualquiera se crea una cuenta y lee las fichas.

### 2. Conectar el sitio

**Project Settings → API**, y copiá los dos valores en `app/config.js`. La *anon key* es pública por diseño; la **service_role key nunca va ahí**.

### 3. Publicar

Con Vercel: *Add New → Project*, importá el repo, sin framework y sin build command.

Para probar en tu máquina — `file://` no sirve porque los módulos ES necesitan servidor:

```sh
cd ~/Documents/saama-formulario && python3 -m http.server 8000
# http://localhost:8000  y  http://localhost:8000/admin.html
```

## Cómo quedó la seguridad

- **Fichas**: el rol público no tiene ningún permiso de lectura. Solo puede insertar las columnas del formulario — nunca `estado` ni `notas` — y la política exige `consentimiento = true`.
- **Sesiones**: el público no tiene ningún permiso, ni de lectura ni de escritura. Son solo de la terapeuta.
- El nombre del paciente en la agenda se trae con el join embebido de PostgREST, que respeta las políticas de las dos tablas. No se usa una vista: una vista corre con los permisos de quien la creó y puede saltear RLS sin que se note.
- El formulario tiene un campo trampa contra bots. Si aparece spam, el paso siguiente es activar Turnstile o hCaptcha en Supabase.
- Son datos de salud (Ley 25.326). El consentimiento del paciente queda registrado en la fila.

## Decisiones que conviene conocer

- **Todo se carga de una vez** y se filtra en el navegador. Es instantáneo para un consultorio de una persona; si algún día pasa de unos miles de registros, hay que paginar dentro de `app/datos.js` sin tocar las vistas.
- **Los colores de los gráficos** (`--dato-*` en `saama.css`) están escalonados con un validador: pasan banda de luminosidad, piso de croma, separación para daltonismo y contraste, en claro y en oscuro. Si se cambia uno hay que volver a validar el trío.
- **Las fechas** se guardan en UTC y se muestran en hora local. Las claves de día usan los getters locales a propósito: con `toISOString()` las sesiones de la noche saltarían al día siguiente.
- **El aviso de ficha nueva sigue siendo manual**: ella entra al panel a mirar. Para aviso automático haría falta un webhook de Supabase a Resend o WhatsApp.
