// routes/admin.js — panel de administración (usuarios, pedidos, catálogo, auditoría, parámetros)
import { Router } from 'express';
import {
  usuarios, pedidos, detalles, resumen,
  categorias, crearCategoria, actualizarCategoria,
  materiales, crearMaterial, actualizarMaterial,
  auditoria, listarParametros, actualizarParametro,
} from '../controllers/adminController.js';
import {
  validarPedidosQuery, validarCategoriaAdmin, validarCategoriaParcial,
  validarMaterialAdmin, validarMaterialParcial, validarParametro, validarAuditoriaQuery,
} from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

// Todo el panel exige sesión de admin
router.use(authRequired, requireRole('admin'));

router.get('/usuarios', usuarios);
router.get('/pedidos', validarPedidosQuery, pedidos);
router.get('/detalles', detalles);
router.get('/resumen', resumen);

// Catálogo
router.get('/categorias', categorias);
router.post('/categorias', validarCategoriaAdmin, crearCategoria);
router.put('/categorias/:id', validarCategoriaParcial, actualizarCategoria);
router.get('/materiales', materiales);
router.post('/materiales', validarMaterialAdmin, crearMaterial);
router.put('/materiales/:id', validarMaterialParcial, actualizarMaterial);

// Auditoría y parámetros del sistema
router.get('/auditoria', validarAuditoriaQuery, auditoria);
router.get('/parametros', listarParametros);
router.put('/parametros/:clave', validarParametro, actualizarParametro);

export default router;
