# 🔧 Resolutor

**Resolutor** es una app web para registrar, organizar y analizar incidentes técnicos en equipos de soporte.

Funciona como una **bitácora colaborativa por workspace**, diseñada para centralizar conocimiento y mejorar la eficiencia operativa.

---

## 🌐 Demo en vivo

👉 https://abelromann.github.io/Resolutor/

**No requiere instalación.**
Puedes registrarte y empezar a usar la app directamente.

---

## 🚀 ¿Qué problema resuelve?

En muchos equipos de soporte técnico, la información sobre incidentes se pierde en chats, correos o notas dispersas.

Resolutor centraliza ese conocimiento para:

* Registrar incidentes con contexto real.
* Dar seguimiento estructurado.
* Trabajar en equipo por workspace.
* Analizar métricas de resolución.

---

## ✨ Funcionalidades

* 🔐 Autenticación por correo
* 🧑‍🤝‍🧑 Workspaces colaborativos
* 📂 Gestión completa de casos
* ✅ Tareas (human / automation / hybrid)
* 📊 Dashboard con métricas
* 🔔 Notificaciones internas

---

## 🤖 Diferenciador clave

Resolutor distingue entre:

* `human` → tareas manuales
* `automation` → tareas automatizables
* `hybrid` → combinación

Esto permite evolucionar hacia sistemas de soporte más inteligentes.

---

## 🧠 Arquitectura (resumen técnico)

* **Frontend:** React + TypeScript + Vite
* **Backend:** Supabase (Auth + DB + Storage)
* **Seguridad:** Row-Level Security (RLS) por workspace

---

## ⚙️ Ejecutar localmente (opcional)

Solo si quieres correr el proyecto en tu entorno:

```bash
git clone <tu-repo>
cd Resolutor
npm install
npm run dev
```

Luego configura:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 🛣️ Roadmap

* [ ] Automatización real de tareas
* [ ] Búsqueda global
* [ ] SLA y tiempos de respuesta
* [ ] Integraciones externas

---

## 📄 Licencia

MIT License © 2026 Abel Rafael Román Sebastián
