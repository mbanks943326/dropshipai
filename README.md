# DropShipAI

Aplicación SaaS multi-tenant para dropshipping automatizado con IA. Descubre productos ganadores de Amazon, AliExpress y Temu.

## 🚀 Características

- **Descubrimiento de Productos**: Busca y analiza productos de múltiples plataformas
- **Análisis con IA**: Motor Gemini para identificar productos ganadores
- **Integración de Tiendas**: Conecta con Shopify, WooCommerce y eBay
- **Modo Automático/Manual**: Flexibilidad total en el flujo de trabajo
- **Dashboard Analítico**: Visualiza ventas, ganancias y ROI
- **Suscripciones**: Modelo freemium con Stripe

## 📁 Estructura del Proyecto

```
├── frontend/          # React + Vite + Tailwind
├── backend/           # Node.js + Express API
├── database/          # Esquemas SQL
└── docs/              # Documentación
```

## ⚙️ Requisitos

- Node.js 18+
- npm 9+
- PostgreSQL / Supabase

## 🔧 Instalación

### 1. Clonar y configurar variables de entorno

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

### 2. Configurar las API Keys en los archivos .env

**Backend (.env):**

```env
PORT=3001
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-super-secret-key
GEMINI_API_KEY=your-gemini-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AMAZON_ACCESS_KEY=your-amazon-key
AMAZON_SECRET_KEY=your-amazon-secret
AMAZON_PARTNER_TAG=your-partner-tag
ALIEXPRESS_APP_KEY=your-aliexpress-key
ALIEXPRESS_SECRET=your-aliexpress-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Instalar dependencias

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 4. Configurar base de datos

```bash
# Ejecutar migraciones en Supabase o PostgreSQL
psql -d your_database -f database/schema.sql
```

### 5. Iniciar servidores de desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📚 API Documentation

### Autenticación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/register` | POST | Registrar nuevo usuario |
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/auth/google` | POST | OAuth con Google |
| `/api/auth/forgot-password` | POST | Solicitar reset |
| `/api/auth/reset-password` | POST | Cambiar contraseña |

### Productos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/products/search` | GET | Buscar productos |
| `/api/products/:id` | GET | Obtener producto |
| `/api/products/winning` | GET | Productos ganadores IA |
| `/api/products/import` | POST | Importar a tienda |

### Tiendas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/stores` | GET | Listar tiendas |
| `/api/stores/connect` | POST | Conectar tienda |
| `/api/stores/:id/sync` | POST | Sincronizar inventario |

### Pedidos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/orders` | GET | Listar pedidos |
| `/api/orders/:id/fulfill` | POST | Cumplir pedido |
| `/api/orders/:id/track` | GET | Tracking |

### Suscripciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/subscriptions` | GET | Estado actual |
| `/api/subscriptions/checkout` | POST | Iniciar pago |
| `/api/subscriptions/cancel` | POST | Cancelar plan |

## 🚀 Despliegue

### Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

### Railway/Render (Backend)

1. Conectar repositorio
2. Configurar variables de entorno
3. Deploy automático

### Variables de entorno de producción

Asegúrate de configurar todas las variables en el panel de tu proveedor de hosting.

## 🔐 Seguridad

- Autenticación JWT con tokens seguros
- Rate limiting en todos los endpoints
- Encriptación de datos sensibles
- Row Level Security en Supabase
- Cumplimiento GDPR/CCPA

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.
