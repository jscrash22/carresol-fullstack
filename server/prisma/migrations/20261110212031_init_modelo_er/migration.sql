-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('tarjeta', 'transferencia', 'deposito', 'contra_entrega');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

-- CreateEnum
CREATE TYPE "TipoMedida" AS ENUM ('unica', 'talla', 'largo', 'diametro');

-- CreateEnum
CREATE TYPE "CanalPreferido" AS ENUM ('email', 'telefono', 'whatsapp');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('factura', 'nota_credito');

-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('cedula', 'ruc', 'pasaporte', 'consumidor_final');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('emitida', 'anulada');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('pendiente', 'preparando', 'en_transito', 'entregado', 'devuelto');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('borrador', 'ordenada', 'recibida', 'cancelada');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('venta', 'compra', 'ajuste', 'devolucion');

-- CreateTable
CREATE TABLE "roles" (
    "id" SMALLSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" BIGSERIAL NOT NULL,
    "rol_id" SMALLINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "cedula" TEXT,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_at" TIMESTAMPTZ(3) NOT NULL,
    "usado_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "alias" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "calle_principal" TEXT NOT NULL,
    "calle_secundaria" TEXT,
    "numeracion" TEXT NOT NULL,
    "referencia" TEXT,
    "codigo_postal" TEXT,
    "es_predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" SMALLINT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" SERIAL NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" BIGSERIAL NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_base" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_materiales" (
    "producto_id" BIGINT NOT NULL,
    "material_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_materiales_pkey" PRIMARY KEY ("producto_id","material_id")
);

-- CreateTable
CREATE TABLE "producto_imagenes" (
    "id" BIGSERIAL NOT NULL,
    "producto_id" BIGINT NOT NULL,
    "material_id" INTEGER,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes" (
    "id" BIGSERIAL NOT NULL,
    "producto_id" BIGINT NOT NULL,
    "material_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "tipo_medida" "TipoMedida" NOT NULL,
    "medida" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 3,
    "peso_gramos" DECIMAL(10,2),
    "costo" DECIMAL(12,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrito_items" (
    "id" BIGSERIAL NOT NULL,
    "carrito_id" BIGINT NOT NULL,
    "variante_id" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carrito_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "producto_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" BIGSERIAL NOT NULL,
    "numero_pedido" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "direccion_id" BIGINT,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'pendiente',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "costo_envio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva_porcentaje" DECIMAL(5,2) NOT NULL,
    "iva_valor" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL DEFAULT 'USD',
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "variante_id" BIGINT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "medida" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_historial_estados" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "estado_anterior" "EstadoPedido",
    "estado_nuevo" "EstadoPedido" NOT NULL,
    "usuario_id" BIGINT,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "pasarela" TEXT NOT NULL DEFAULT 'simulada',
    "referencia_externa" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL DEFAULT 'USD',
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "respuesta_pasarela" JSONB,
    "fecha_pago" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_emision" (
    "establecimiento" CHAR(3) NOT NULL,
    "punto" CHAR(3) NOT NULL,
    "ultimo_secuencial" BIGINT NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "puntos_emision_pkey" PRIMARY KEY ("establecimiento","punto")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "establecimiento" CHAR(3) NOT NULL,
    "punto_emision" CHAR(3) NOT NULL,
    "secuencial" BIGINT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoFactura" NOT NULL DEFAULT 'factura',
    "tipo_identificacion" "TipoIdentificacion" NOT NULL,
    "identificacion" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "email_facturacion" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion_fiscal" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "costo_envio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva_porcentaje" DECIMAL(5,2) NOT NULL,
    "iva_valor" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'emitida',
    "clave_acceso" TEXT NOT NULL,
    "fecha_emision" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada_at" TIMESTAMPTZ(3),
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios" (
    "id" BIGSERIAL NOT NULL,
    "pedido_id" BIGINT NOT NULL,
    "direccion_snapshot" JSONB,
    "transportista" TEXT,
    "numero_guia" TEXT,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'pendiente',
    "costo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fecha_despacho" TIMESTAMPTZ(3),
    "fecha_estimada" DATE,
    "fecha_entrega" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_contacto" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "mensaje" TEXT NOT NULL,
    "canal_preferido" "CanalPreferido" NOT NULL DEFAULT 'email',
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leido_at" TIMESTAMPTZ(3),
    "leido_por" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_sistema" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parametros_sistema_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "tabla" TEXT NOT NULL,
    "registro_id" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "usuario_id" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "contacto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" BIGSERIAL NOT NULL,
    "numero_compra" BIGSERIAL NOT NULL,
    "proveedor_id" BIGINT NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'borrador',
    "numero_factura_proveedor" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "iva_porcentaje" DECIMAL(5,2) NOT NULL,
    "iva_valor" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" CHAR(3) NOT NULL DEFAULT 'USD',
    "fecha_compra" TIMESTAMPTZ(3),
    "fecha_recepcion" TIMESTAMPTZ(3),
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_items" (
    "id" BIGSERIAL NOT NULL,
    "compra_id" BIGINT NOT NULL,
    "variante_id" BIGINT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" BIGSERIAL NOT NULL,
    "variante_id" BIGINT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "usuario_id" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rol_id_idx" ON "usuarios"("rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_usuario_id_idx" ON "password_reset_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "direcciones_usuario_id_idx" ON "direcciones"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_nombre_key" ON "materiales"("nombre");

-- CreateIndex
CREATE INDEX "materiales_categoria_id_idx" ON "materiales"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "productos_categoria_id_idx" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "producto_materiales_categoria_id_idx" ON "producto_materiales"("categoria_id");

-- CreateIndex
CREATE INDEX "producto_imagenes_producto_id_idx" ON "producto_imagenes"("producto_id");

-- CreateIndex
CREATE INDEX "producto_imagenes_material_id_idx" ON "producto_imagenes"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_sku_key" ON "variantes"("sku");

-- CreateIndex
CREATE INDEX "variantes_producto_id_idx" ON "variantes"("producto_id");

-- CreateIndex
CREATE INDEX "variantes_material_id_idx" ON "variantes"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "carritos_usuario_id_key" ON "carritos"("usuario_id");

-- CreateIndex
CREATE INDEX "carrito_items_variante_id_idx" ON "carrito_items"("variante_id");

-- CreateIndex
CREATE UNIQUE INDEX "carrito_items_carrito_id_variante_id_key" ON "carrito_items"("carrito_id", "variante_id");

-- CreateIndex
CREATE INDEX "favoritos_producto_id_idx" ON "favoritos"("producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_usuario_id_producto_id_key" ON "favoritos"("usuario_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_pedido_key" ON "pedidos"("numero_pedido");

-- CreateIndex
CREATE INDEX "pedidos_usuario_id_idx" ON "pedidos"("usuario_id");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "pedido_items_pedido_id_idx" ON "pedido_items"("pedido_id");

-- CreateIndex
CREATE INDEX "pedido_items_variante_id_idx" ON "pedido_items"("variante_id");

-- CreateIndex
CREATE INDEX "pedido_historial_estados_pedido_id_idx" ON "pedido_historial_estados"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_referencia_externa_key" ON "pagos"("referencia_externa");

-- CreateIndex
CREATE INDEX "pagos_pedido_id_idx" ON "pagos"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_pedido_id_key" ON "facturas"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_numero_key" ON "facturas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_clave_acceso_key" ON "facturas"("clave_acceso");

-- CreateIndex
CREATE INDEX "facturas_pedido_id_idx" ON "facturas"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "envios_pedido_id_key" ON "envios"("pedido_id");

-- CreateIndex
CREATE INDEX "envios_pedido_id_idx" ON "envios"("pedido_id");

-- CreateIndex
CREATE INDEX "mensajes_contacto_usuario_id_idx" ON "mensajes_contacto"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_tabla_idx" ON "auditoria"("tabla");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_ruc_key" ON "proveedores"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "compras_numero_compra_key" ON "compras"("numero_compra");

-- CreateIndex
CREATE INDEX "compras_proveedor_id_idx" ON "compras"("proveedor_id");

-- CreateIndex
CREATE INDEX "compras_usuario_id_idx" ON "compras"("usuario_id");

-- CreateIndex
CREATE INDEX "compra_items_compra_id_idx" ON "compra_items"("compra_id");

-- CreateIndex
CREATE INDEX "compra_items_variante_id_idx" ON "compra_items"("variante_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_variante_id_idx" ON "movimientos_inventario"("variante_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_tipo_idx" ON "movimientos_inventario"("tipo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales" ADD CONSTRAINT "materiales_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_materiales" ADD CONSTRAINT "producto_materiales_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_materiales" ADD CONSTRAINT "producto_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_materiales" ADD CONSTRAINT "producto_materiales_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_items" ADD CONSTRAINT "carrito_items_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_items" ADD CONSTRAINT "carrito_items_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_historial_estados" ADD CONSTRAINT "pedido_historial_estados_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_historial_estados" ADD CONSTRAINT "pedido_historial_estados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_establecimiento_punto_emision_fkey" FOREIGN KEY ("establecimiento", "punto_emision") REFERENCES "puntos_emision"("establecimiento", "punto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_contacto" ADD CONSTRAINT "mensajes_contacto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_contacto" ADD CONSTRAINT "mensajes_contacto_leido_por_fkey" FOREIGN KEY ("leido_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Restricciones CHECK del modelo ER (agregadas a mano; Prisma no
-- las expresa). Ver prompt §4.8 y docs/DECISIONES.md.
-- ============================================================

-- Catálogo: precios y stock nunca negativos
ALTER TABLE "productos" ADD CONSTRAINT "productos_precio_base_check" CHECK ("precio_base" >= 0);
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_stock_minimo_check" CHECK ("stock_minimo" >= 0);
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_precio_check" CHECK ("precio" >= 0);
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_costo_check" CHECK ("costo" IS NULL OR "costo" >= 0);
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_peso_check" CHECK ("peso_gramos" IS NULL OR "peso_gramos" > 0);

-- Cantidades siempre positivas en items
ALTER TABLE "carrito_items" ADD CONSTRAINT "carrito_items_cantidad_check" CHECK ("cantidad" > 0);
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_cantidad_check" CHECK ("cantidad" > 0);
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_precios_check" CHECK ("precio_unitario" >= 0 AND "subtotal" >= 0);
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_cantidad_check" CHECK ("cantidad" > 0);
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_costos_check" CHECK ("costo_unitario" >= 0 AND "subtotal" >= 0);

-- Totales de pedidos, pagos, compras y facturas coherentes (>= 0)
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_importes_check" CHECK ("subtotal" >= 0 AND "costo_envio" >= 0 AND "iva_porcentaje" >= 0 AND "iva_valor" >= 0 AND "total" >= 0);
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_monto_check" CHECK ("monto" >= 0);
ALTER TABLE "compras" ADD CONSTRAINT "compras_importes_check" CHECK ("subtotal" >= 0 AND "iva_porcentaje" >= 0 AND "iva_valor" >= 0 AND "total" >= 0);
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_importes_check" CHECK ("subtotal" >= 0 AND "costo_envio" >= 0 AND "iva_porcentaje" >= 0 AND "iva_valor" >= 0 AND "total" >= 0);

-- La clave de acceso de la factura es un identificador de EXACTAMENTE 49 caracteres
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_clave_acceso_longitud_check" CHECK (char_length("clave_acceso") = 49);

-- Envíos e inventario
ALTER TABLE "envios" ADD CONSTRAINT "envios_costo_check" CHECK ("costo" >= 0);
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_cantidad_check" CHECK ("cantidad" <> 0);
