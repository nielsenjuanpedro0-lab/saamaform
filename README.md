# SAAMA — Ficha de admisión + Consultorio

Dos páginas estáticas sobre Supabase. Sin build, sin dependencias que instalar.

| Ruta | Qué es | Quién entra |
|---|---|---|
| `/` | Ficha de admisión que completa el paciente | Cualquiera con el link |
| `/admin` | Panel de la terapeuta: fichas, estados, notas, CSV | Solo con usuario y contraseña |

## Archivos

```
index.html            Formulario público
admin.html            Panel /admin
app/config.js         URL y anon key de Supabase   ← lo único que hay que completar
app/db.js             Cliente de Supabase
app/ficha.js          Definición de los campos (fuente de verdad de las 2 páginas)
app/saama.css         Estilos y paleta compartidos
supabase/schema.sql   Tabla, permisos y políticas RLS
vercel.json           Rutas limpias y cabeceras
```

Para agregar o cambiar una pregunta: tocá `app/ficha.js` y agregá la columna en `supabase/schema.sql`. El formulario, el panel y el CSV se actualizan solos.

## Puesta en marcha

### 1. Base de datos

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan gratis alcanza de sobra).
2. **SQL Editor** → pegá todo `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user**: el correo y la contraseña de tu mamá. Tildá *Auto Confirm User*.
4. **Authentication → Sign In / Providers → Email**: desactivá *Allow new users to sign up*. Sin esto, cualquiera podría crearse una cuenta y leer las fichas.

### 2. Conectar el sitio

**Project Settings → API**, y copiá los dos valores en `app/config.js`:

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhb...";
```

La *anon key* es pública por diseño: viaja en el navegador y no habilita nada que las políticas RLS no permitan. La **service_role key nunca va acá** — esa saltea todas las políticas.

### 3. Publicar

Con [Vercel](https://vercel.com): *Add New → Project*, importá esta carpeta (o el repo), sin framework y sin build command. Queda en `tu-proyecto.vercel.app` y `/admin`.

Para probar antes en tu máquina — un `file://` no sirve porque los módulos ES necesitan servidor:

```sh
cd ~/Documents/saama-formulario && python3 -m http.server 8000
# http://localhost:8000  y  http://localhost:8000/admin.html
```

## Cómo quedó la seguridad

- **Leer fichas** requiere estar logueado. El rol público no tiene ningún permiso de `select`: aunque alguien saque la anon key del código fuente, no puede listar nada.
- **Escribir** está limitado por columna: el público solo puede insertar los campos de la ficha, nunca `estado` ni `notas`, y la política exige `consentimiento = true`.
- **Las notas** de la terapeuta viven en la misma fila pero solo se leen con sesión iniciada.
- El formulario tiene un campo trampa contra bots. No hay captcha: si aparece spam, el paso siguiente es activar Turnstile o hCaptcha en Supabase.
- Son datos de salud (Ley 25.326). El consentimiento del paciente queda registrado en la fila.

## Pendientes conocidos

- El aviso de ficha nueva es manual: ella entra al panel a mirar. Si más adelante quieren aviso automático, se resuelve con un webhook de Supabase a Resend o a WhatsApp.
- La búsqueda y el filtrado se hacen sobre las fichas ya cargadas en el navegador. Andan cómodos hasta unas mil fichas; más que eso conviene paginar.
