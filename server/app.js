// app.js — configuración de Express (sin arranque; ver server.js)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loggerMiddleware } from './utils/logger.js';
import { noEncontrado, errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import productosRouter from './routes/productos.js';
import pedidosRouter from './routes/pedidos.js';
import direccionesRouter from './routes/direcciones.js';
import carritoRouter from './routes/carrito.js';
import favoritosRouter from './routes/favoritos.js';
import contactoRouter from './routes/contacto.js';
import comprasRouter from './routes/compras.js';
import proveedoresRouter from './routes/proveedores.js';
import inventarioRouter from './routes/inventario.js';
import adminRouter from './routes/admin.js';
import configPublicaRouter from './routes/configPublica.js';

const app = express();

// Detrás del proxy de Render (y de cualquier reverse proxy de una sola capa):
// confiar en el primer proxy para que req.ip / rate-limit vean la IP real.
app.set('trust proxy', 1);

// Seguridad HTTP básica (cabeceras, x-powered-by desactivado por helmet)
app.disable('x-powered-by');
app.use(helmet());

// CORS con lista blanca: PROHIBIDO el comodín * (se valida al arrancar)
const origenes = (process.env.CORS_ORIGIN || 'http://localhost:5500')
  .split(',').map((o) => o.trim()).filter(Boolean);
if (origenes.includes('*')) {
  throw new Error('CORS_ORIGIN no puede ser * — define orígenes concretos en server/.env');
}
app.use(cors({
  origin: (origen, cb) => {
    if (!origen || origenes.includes(origen)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Logger de peticiones (middleware propio)
app.use(loggerMiddleware);

// Body JSON con límite ampliado para pedidos con muchos ítems y productos con
// variantes/imágenes. El tamaño de los ARREGLOS se valida aparte en validators.js
// (ítems, variantes, imágenes) para no abrir la puerta a abusos.
app.use(express.json({ limit: '64kb' }));

// Configuración pública para el carrito/checkout (IVA, moneda, envío)
app.use('/api/config-publica', configPublicaRouter);

// Salud del servicio
app.get('/', (req, res) => {
  res.json({ ok: true, data: { servicio: 'Carresol API', estado: 'en línea', version: '2.0.0' } });
});

// Health check para Render: responde sin tocar la base de datos.
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Rutas de la API (prefijo /api)
app.use('/api/auth', authRouter);
app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/direcciones', direccionesRouter);
app.use('/api/carrito', carritoRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/contacto', contactoRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/proveedores', proveedoresRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/admin', adminRouter);

// 404 consistente + manejo de errores centralizado
app.use(noEncontrado);
app.use(errorHandler);

export default app;
