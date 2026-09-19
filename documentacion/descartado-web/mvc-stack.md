## Stack Tecnológico Recomendado
### Componentes de la Arquitectura
1. **Frontend (UI / UX Mobile-First):**
* **Next.js (React) + Tailwind CSS + shadcn/ui:** Proporciona un diseño fluido e impecable en dispositivos móviles, con renderizado rápido para los formularios de inscripción y los paneles de control.
2. **Backend & Lógica de Negocio:**
* **Node.js (TypeScript / API Routes):** Permite implementar con exactitud el algoritmo de emparejamiento basado en reglas (edad, peso, cinturón, agresividad) y compartir los tipos de datos entre el servidor y la interfaz.
3. **Base de Datos & Tiempo Real (Real-Time):**
* **PostgreSQL (vía Supabase):** PostgreSQL es idóneo para estructurar las relaciones complejas del sistema (roles duales, linaje/árbol jerárquico y estados de visibilidad). Supabase incluye canales WebSocket para actualizar las llaves de torneo en vivo mientras los jurados cargan resultados.
4. **Autenticación & Infraestructura:**
* **Supabase Auth + Vercel:** Facilita la gestión de permisos por rol (profesor vs. organizador) y ofrece un despliegue de alta disponibilidad y bajo costo inicial.

