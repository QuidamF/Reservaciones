# Agendador de Citas

Este proyecto es una aplicación web que permite a un usuario definir su disponibilidad y deja que otros reserven citas directamente en su Google Calendar.

## Características

- **Backend:** Python, FastAPI
- **Frontend:** React (con Vite), Ant Design
- **Integración con Calendario:** API de Google Calendar
- **Configuración del Propietario:** Una interfaz de usuario para que el propietario del calendario defina su disponibilidad semanal, horas de trabajo y descansos.
- **Reserva de Clientes:** Una interfaz de usuario para que los clientes vean los horarios disponibles en tiempo real y reserven una cita.
- **Disponibilidad en Tiempo Real:** La aplicación cruza las reglas del propietario con su calendario real de Google para mostrar solo los espacios genuinamente libres.
- **Reserva Directa:** Las citas reservadas por los clientes se crean directamente como eventos en el Google Calendar del propietario.

## Cómo Ejecutar la Aplicación

Este proyecto utiliza Docker para el backend para garantizar un entorno consistente y simplificar la configuración. El frontend es una aplicación React estándar.

### Prerrequisitos

- **Docker y Docker Compose:** Asegúrate de tener Docker instalado y funcionando en tu sistema. Puedes obtenerlo desde el [sitio web oficial de Docker](https://www.docker.com/products/docker-desktop).
- **Node.js:** Necesitarás Node.js (y npm) para ejecutar el frontend. Puedes descargarlo desde [nodejs.org](https://nodejs.org/).

### Paso 1: Configuración de la API de Google Calendar

Antes de ejecutar la aplicación, debes obtener las credenciales para la API de Google Calendar.

**-> Para instrucciones detalladas, por favor consulta el archivo `google_auth.md`.**

Después de seguir las instrucciones, deberías tener un archivo `credentials.json` ubicado dentro del directorio `backend`.

### Paso 2: Configuración del Backend (Docker & FastAPI)

1.  **Abre una terminal** y navega al directorio raíz de este proyecto.
2.  **Ejecuta el comando de Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    Este comando hará lo siguiente:
    - Construirá la imagen de Docker para el servicio del backend (la primera vez que lo ejecutes).
    - Iniciará un contenedor para el servicio del backend.
    - La API del backend estará corriendo en `http://127.0.0.1:8000`.

    Puedes agregar el flag `-d` (`docker-compose up --build -d`) para ejecutar el contenedor en modo detached (en segundo plano).

### Paso 3: Configuración del Frontend (React)

1.  **Abre una nueva terminal** y navega al directorio `frontend`:
    ```bash
    cd frontend
    ```
2.  **Instala las dependencias de Node.js:**
    ```bash
    npm install
    ```
3.  **Ejecuta el servidor de desarrollo de React:**
    ```bash
    npm run dev
    ```
    La aplicación frontend estará accesible en `http://localhost:5173` (u otro puerto si el 5173 está ocupado).

### Paso 4: Autenticación de Google por Primera Vez

1.  Una vez que el backend esté funcionando, abre tu navegador y ve a:
    `http://127.0.0.1:8000/auth/google`
2.  Esto iniciará el proceso de autenticación. Tu navegador abrirá una nueva pestaña pidiéndote que inicies sesión con tu cuenta de Google y que concedas permiso a la aplicación para acceder a tu calendario.
3.  Después de que concedas el permiso, la aplicación almacenará un archivo `token.json` en el directorio `backend`. Este archivo te mantendrá autenticado para futuras sesiones.

### Paso 5: Usando la Aplicación

1.  **Abre la aplicación frontend** en tu navegador (por ejemplo, `http://localhost:5173`).
2.  **Configura tu disponibilidad:**
    *   Usa la vista "Configurar" para establecer tus horas de trabajo semanales, descansos y la duración de las citas.
    *   Haz clic en "Guardar Configuración".
3.  **Reserva una cita:**
    *   Cambia a la vista "Reservar Cita".
    *   Selecciona una fecha. La aplicación buscará los horarios disponibles que no entren en conflicto con tus reglas o eventos existentes en tu Google Calendar.
    *   Elige un horario y haz clic en "Reservar". El evento se creará en tu Google Calendar automáticamente.
