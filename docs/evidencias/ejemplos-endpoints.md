# Ejemplos reales de request/response (§9)

Generados automáticamente contra `http://localhost:3000` y la base PostgreSQL real el 2026-11-10T21:48:48.817Z.

**Enmascarado por seguridad:** los JWT se sustituyen por `<JWT_OMITIDO>` y las contraseñas por `<CONTRASEÑA_REAL_EN_.ENV>`. Los arreglos largos se recortan indicando el total real.

---

## Login de administrador (token enmascarado)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@carresol.com",
  "password": "<CONTRASEÑA_REAL_EN_.ENV>"
}
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "usuario": {
      "id": 1,
      "nombre": "Admin Carresol",
      "telefono": "0999999999",
      "email": "admin@carresol.com",
      "cedula": "1701345678",
      "emailVerificado": false,
      "activo": true,
      "role": "admin",
      "ultimoLogin": "2026-11-10T21:47:46.841Z",
      "createdAt": "2026-11-10T21:47:28.647Z"
    },
    "token": "<JWT_OMITIDO>"
  }
}
```

## Login de cliente (token enmascarado)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "cliente@carresol.com",
  "password": "<CONTRASEÑA_REAL_EN_.ENV>"
}
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "usuario": {
      "id": 2,
      "nombre": "Cliente Prueba",
      "telefono": "0991234567",
      "email": "cliente@carresol.com",
      "cedula": "1701345678",
      "emailVerificado": false,
      "activo": true,
      "role": "user",
      "ultimoLogin": "2026-11-10T21:47:47.444Z",
      "createdAt": "2026-11-10T21:47:29.207Z"
    },
    "token": "<JWT_OMITIDO>"
  }
}
```

## Catálogo público filtrado por categoría

```http
GET /api/productos?categoria=anillos
Content-Type: application/json
```

```json
{
  "status": 200,
  "ok": true,
  "data": [
    {
      "id": 16,
      "nombre": "Anillo Carresol Solitario",
      "slug": "anillo-carresol-solitario",
      "descripcion": "Solitario de diamante en oro amarillo.",
      "categoria": "anillos",
      "categoriaNombre": "Anillos",
      "precio": 480,
      "precioBase": 480,
      "stock": 29,
      "imagen": "assets/img/anillos/anillo-carresol-solitario.jpg",
      "alt": "Anillo solitario Carresol con diamante",
      "destacado": true,
      "activo": true,
      "createdAt": "2026-11-10T21:47:30.195Z",
      "variantes": [
        {
          "id": 26,
          "productoId": 16,
          "sku": "ANI-SOL-ORO-7",
          "material": "Oro 18k",
          "materialId": 2,
          "tipoMedida": "talla",
          "medida": "7",
          "precio": 480,
          "stock": 13,
          "stockMinimo": 3,
          "activo": true
        },
        {
          "id": 27,
          "productoId": 16,
          "sku": "ANI-SOL-PLA-8",
          "material": "Plata 925",
          "materialId": 4,
          "tipoMedida": "talla",
          "medida": "8",
          "precio": 490,
          "stock": 16,
          "stockMinimo": 3,
          "activo": true
        }
      ],
      "materiales": [
        {
          "id": 2,
          "nombre": "Oro 18k"
        },
        {
          "id": 4,
          "nombre": "Plata 925"
        }
      ],
      "imagenes": [
        {
          "id": 16,
          "url": "assets/img/anillos/anillo-carresol-solitario.jpg",
          "alt": "Anillo solitario Carresol con diamante",
          "esPrincipal": true
        }
      ]
    },
    {
      "id": 17,
      "nombre": "Anillo Carresol Compromiso",
      "slug": "anillo-carresol-compromiso",
      "descripcion": "Anillo de compromiso con piedra central.",
      "categoria": "anillos",
      "categoriaNombre": "Anillos",
      "precio": 720,
      "precioBase": 720,
      "stock": 43,
      "imagen": "assets/img/anillos/anillo-carresol-compromiso.jpg",
      "alt": "Anillo de compromiso Carresol",
      "destacado": false,
      "activo": true,
      "createdAt": "2026-11-10T21:47:30.214Z",
      "variantes": [
        {
          "id": 28,
          "productoId": 17,
          "sku": "ANI-COM-PER-7",
          "material": "Perlas",
          "materialId": 3,
          "tipoMedida": "talla",
          "medida": "7",
          "precio": 720,
          "stock": 20,
          "stockMinimo": 3,
          "activo": true
        },
        {
          "id": 29,
          "productoId": 17,
          "sku": "ANI-COM-ORB-8",
          "material": "Oro blanco",
          "materialId": 5,
          "tipoMedida": "talla",
          "medida": "8",
          "precio": 730,
          "stock": 23,
          "stockMinimo": 3,
          "activo": true
        }
      ],
      "materiales": [
        {
          "id": 3,
          "nombre": "Perlas"
        },
        {
          "id": 5,
          "nombre": "Oro blanco"
        }
      ],
      "imagenes": [
        {
          "id": 17,
          "url": "assets/img/anillos/anillo-carresol-compromiso.jpg",
          "alt": "Anillo de compromiso Carresol",
          "esPrincipal": true
        }
      ]
    },
    "… (5 elementos en total)"
  ]
}
```

## Detalle de producto con variantes, materiales e imágenes

```http
GET /api/productos/3
Content-Type: application/json
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "id": 3,
    "nombre": "Reloj Carresol Sport",
    "slug": "reloj-carresol-sport",
    "descripcion": "Resistente al agua, ideal para uso diario.",
    "categoria": "relojes",
    "categoriaNombre": "Relojes",
    "precio": 320,
    "precioBase": 320,
    "stock": 26,
    "imagen": "assets/img/relojes/reloj-carresol-sport.jpg",
    "alt": "Reloj deportivo Carresol de pulsera metálica",
    "destacado": false,
    "activo": true,
    "createdAt": "2026-11-10T21:47:29.956Z",
    "variantes": [
      {
        "id": 3,
        "productoId": 3,
        "sku": "REL-SPO-PLA",
        "material": "Plata 925",
        "materialId": 4,
        "tipoMedida": "unica",
        "medida": "Única",
        "precio": 320,
        "stock": 26,
        "stockMinimo": 3,
        "activo": true
      }
    ],
    "materiales": [
      {
        "id": 1,
        "nombre": "Acero inoxidable"
      },
      {
        "id": 4,
        "nombre": "Plata 925"
      }
    ],
    "imagenes": [
      {
        "id": 3,
        "url": "assets/img/relojes/reloj-carresol-sport.jpg",
        "alt": "Reloj deportivo Carresol de pulsera metálica",
        "esPrincipal": true
      }
    ]
  }
}
```

## Crear dirección de envío (autenticado)

```http
POST /api/direcciones
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json

{
  "alias": "Casa Ejemplo",
  "destinatario": "Cliente De Prueba",
  "telefono": "0991234567",
  "provincia": "Pichincha",
  "ciudad": "Quito",
  "callePrincipal": "Av. América",
  "numeracion": "N12-34",
  "esPredeterminada": true
}
```

```json
{
  "status": 201,
  "ok": true,
  "data": {
    "id": 3,
    "alias": "Casa Ejemplo",
    "destinatario": "Cliente De Prueba",
    "telefono": "0991234567",
    "provincia": "Pichincha",
    "ciudad": "Quito",
    "callePrincipal": "Av. América",
    "calleSecundaria": null,
    "numeracion": "N12-34",
    "referencia": null,
    "codigoPostal": null,
    "esPredeterminada": true,
    "activa": true,
    "createdAt": "2026-11-10T21:48:48.434Z"
  }
}
```

## Confirmar pedido (transacción completa: items + pago + envío + factura + historial)

```http
POST /api/pedidos
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json

{
  "items": [
    {
      "varianteId": 1,
      "cantidad": 1
    }
  ],
  "direccionId": 3,
  "metodoPago": "tarjeta",
  "facturacion": {
    "tipoIdentificacion": "consumidor_final"
  }
}
```

```json
{
  "status": 201,
  "ok": true,
  "data": {
    "id": 4,
    "numeroPedido": 4,
    "estado": "pagado",
    "subtotal": 450,
    "costoEnvio": 10,
    "ivaPorcentaje": 15,
    "ivaValor": 69,
    "total": 529,
    "moneda": "USD",
    "notas": null,
    "createdAt": "2026-11-10T21:48:48.527Z",
    "usuario": {
      "id": 2,
      "nombre": "Cliente Prueba",
      "email": "cliente@carresol.com"
    },
    "items": [
      {
        "id": 4,
        "sku": "REL-IMP-ORO",
        "nombreProducto": "Reloj Carresol Imperial",
        "material": "Oro 18k",
        "medida": "Única",
        "cantidad": 1,
        "precioUnitario": 450,
        "subtotal": 450
      }
    ],
    "pago": {
      "metodo": "tarjeta",
      "pasarela": "simulada",
      "referenciaExterna": "SIM-1794347328538-5fa2f4ffaa",
      "monto": 529,
      "estado": "aprobado",
      "fechaPago": "2026-11-10T21:48:48.538Z"
    },
    "envio": {
      "transportista": null,
      "numeroGuia": null,
      "estado": "pendiente",
      "costo": 10,
      "fechaDespacho": null,
      "fechaEstimada": null,
      "fechaEntrega": null,
      "direccion": {
        "alias": "Casa Ejemplo",
        "ciudad": "Quito",
        "telefono": "0991234567",
        "provincia": "Pichincha",
        "numeracion": "N12-34",
        "referencia": null,
        "codigoPostal": null,
        "destinatario": "Cliente De Prueba",
        "callePrincipal": "Av. América",
        "calleSecundaria": null
      }
    },
    "factura": {
      "numero": "001-001-000000004",
      "secuencial": 4,
      "establecimiento": "001",
      "puntoEmision": "001",
      "tipo": "factura",
      "tipoIdentificacion": "consumidor_final",
      "identificacion": "9999999999999",
      "razonSocial": "Cliente Prueba",
      "subtotal": 450,
      "ivaPorcentaje": 15,
      "ivaValor": 69,
      "total": 529,
      "estado": "emitida",
      "claveAcceso": "1011202601999999999999910010010000000044437643067",
      "fechaEmision": "2026-11-10T21:48:48.556Z"
    },
    "historial": [
      {
        "estadoAnterior": null,
        "estadoNuevo": "pagado",
        "comentario": "Pedido creado con pago aprobado (tarjeta simulada).",
        "usuario": {
          "id": 2,
          "nombre": "Cliente Prueba"
        },
        "createdAt": "2026-11-10T21:48:48.537Z"
      }
    ]
  }
}
```

## Mis pedidos (autenticado)

```http
GET /api/pedidos/mis-pedidos
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json
```

```json
{
  "status": 200,
  "ok": true,
  "data": [
    {
      "id": 4,
      "numeroPedido": 4,
      "estado": "pagado",
      "subtotal": 450,
      "costoEnvio": 10,
      "ivaPorcentaje": 15,
      "ivaValor": 69,
      "total": 529,
      "moneda": "USD",
      "notas": null,
      "createdAt": "2026-11-10T21:48:48.527Z",
      "usuario": {
        "id": 2,
        "nombre": "Cliente Prueba",
        "email": "cliente@carresol.com"
      },
      "items": [
        {
          "id": 4,
          "sku": "REL-IMP-ORO",
          "nombreProducto": "Reloj Carresol Imperial",
          "material": "Oro 18k",
          "medida": "Única",
          "cantidad": 1,
          "precioUnitario": 450,
          "subtotal": 450
        }
      ],
      "pago": {
        "metodo": "tarjeta",
        "pasarela": "simulada",
        "referenciaExterna": "SIM-1794347328538-5fa2f4ffaa",
        "monto": 529,
        "estado": "aprobado",
        "fechaPago": "2026-11-10T21:48:48.538Z"
      },
      "envio": {
        "transportista": null,
        "numeroGuia": null,
        "estado": "pendiente",
        "costo": 10,
        "fechaDespacho": null,
        "fechaEstimada": null,
        "fechaEntrega": null,
        "direccion": {
          "alias": "Casa Ejemplo",
          "ciudad": "Quito",
          "telefono": "0991234567",
          "provincia": "Pichincha",
          "numeracion": "N12-34",
          "referencia": null,
          "codigoPostal": null,
          "destinatario": "Cliente De Prueba",
          "callePrincipal": "Av. América",
          "calleSecundaria": null
        }
      },
      "factura": {
        "numero": "001-001-000000004",
        "secuencial": 4,
        "establecimiento": "001",
        "puntoEmision": "001",
        "tipo": "factura",
        "tipoIdentificacion": "consumidor_final",
        "identificacion": "9999999999999",
        "razonSocial": "Cliente Prueba",
        "subtotal": 450,
        "ivaPorcentaje": 15,
        "ivaValor": 69,
        "total": 529,
        "estado": "emitida",
        "claveAcceso": "1011202601999999999999910010010000000044437643067",
        "fechaEmision": "2026-11-10T21:48:48.556Z"
      },
      "historial": [
        {
          "estadoAnterior": null,
          "estadoNuevo": "pagado",
          "comentario": "Pedido creado con pago aprobado (tarjeta simulada).",
          "usuario": {
            "id": 2,
            "nombre": "Cliente Prueba"
          },
          "createdAt": "2026-11-10T21:48:48.537Z"
        }
      ]
    },
    {
      "id": 3,
      "numeroPedido": 3,
      "estado": "cancelado",
      "subtotal": 99.99,
      "costoEnvio": 10,
      "ivaPorcentaje": 15,
      "ivaValor": 16.5,
      "total": 126.49,
      "moneda": "USD",
      "notas": null,
      "createdAt": "2026-11-10T21:47:49.091Z",
      "usuario": {
        "id": 2,
        "nombre": "Cliente Prueba",
        "email": "cliente@carresol.com"
      },
      "items": [
        {
          "id": 3,
          "sku": "REL-PRO-SMO-TES-ACE-NICA-WDEI",
          "nombreProducto": "Producto Smoke Test",
          "material": "Acero inoxidable",
          "medida": "Única",
          "cantidad": 1,
          "precioUnitario": 99.99,
          "subtotal": 99.99
        }
      ],
      "pago": {
        "metodo": "tarjeta",
        "pasarela": "simulada",
        "referenciaExterna": "SIM-1794347269096-e053e2f7e7",
        "monto": 126.49,
        "estado": "reembolsado",
        "fechaPago": "2026-11-10T21:47:49.096Z"
      },
      "envio": {
        "transportista": null,
        "numeroGuia": null,
        "estado": "pendiente",
        "costo": 10,
        "fechaDespacho": null,
        "fechaEstimada": null,
        "fechaEntrega": null,
        "direccion": {
          "alias": "Oficina Smoke",
          "ciudad": "Quito",
          "telefono": "0998765432",
          "provincia": "Pichincha",
          "numeracion": "N27-112",
          "referencia": "Edificio azul, junto a la farmacia",
          "codigoPostal": "170135",
          "destinatario": "Cliente De Prueba",
          "callePrincipal": "Av. 6 de Diciembre",
          "calleSecundaria": "Y Wilson"
        }
      },
      "factura": {
        "numero": "001-001-000000003",
        "secuencial": 3,
        "establecimiento": "001",
        "puntoEmision": "001",
        "tipo": "factura",
        "tipoIdentificacion": "consumidor_final",
        "identificacion": "9999999999999",
        "razonSocial": "Cliente Prueba",
        "subtotal": 99.99,
        "ivaPorcentaje": 15,
        "ivaValor": 16.5,
        "total": 126.49,
        "estado": "emitida",
        "claveAcceso": "1011202601999999999999910010010000000033486517055",
        "fechaEmision": "2026-11-10T21:47:49.114Z"
      },
      "historial": [
        {
          "estadoAnterior": null,
          "estadoNuevo": "pagado",
          "comentario": "Pedido creado con pago aprobado (tarjeta simulada).",
          "usuario": {
            "id": 2,
            "nombre": "Cliente Prueba"
          },
          "createdAt": "2026-11-10T21:47:49.107Z"
        },
        {
          "estadoAnterior": "pagado",
          "estadoNuevo": "cancelado",
          "comentario": "Smoke: cancelación por admin",
          "usuario": {
            "id": 1,
            "nombre": "Admin Carresol"
          },
          "createdAt": "2026-11-10T21:47:49.218Z"
        }
      ]
    },
    "… (4 elementos en total)"
  ]
}
```

## Admin cambia el estado del pedido (crea fila de historial)

```http
PATCH /api/pedidos/4/estado
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json

{
  "estado": "preparando",
  "comentario": "Ejemplo de la evidencia"
}
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "id": 4,
    "numeroPedido": 4,
    "estado": "preparando",
    "subtotal": 450,
    "costoEnvio": 10,
    "ivaPorcentaje": 15,
    "ivaValor": 69,
    "total": 529,
    "moneda": "USD",
    "notas": null,
    "createdAt": "2026-11-10T21:48:48.527Z",
    "usuario": {
      "id": 2,
      "nombre": "Cliente Prueba",
      "email": "cliente@carresol.com"
    },
    "items": [
      {
        "id": 4,
        "sku": "REL-IMP-ORO",
        "nombreProducto": "Reloj Carresol Imperial",
        "material": "Oro 18k",
        "medida": "Única",
        "cantidad": 1,
        "precioUnitario": 450,
        "subtotal": 450
      }
    ],
    "pago": {
      "metodo": "tarjeta",
      "pasarela": "simulada",
      "referenciaExterna": "SIM-1794347328538-5fa2f4ffaa",
      "monto": 529,
      "estado": "aprobado",
      "fechaPago": "2026-11-10T21:48:48.538Z"
    },
    "envio": {
      "transportista": null,
      "numeroGuia": null,
      "estado": "pendiente",
      "costo": 10,
      "fechaDespacho": null,
      "fechaEstimada": null,
      "fechaEntrega": null,
      "direccion": {
        "alias": "Casa Ejemplo",
        "ciudad": "Quito",
        "telefono": "0991234567",
        "provincia": "Pichincha",
        "numeracion": "N12-34",
        "referencia": null,
        "codigoPostal": null,
        "destinatario": "Cliente De Prueba",
        "callePrincipal": "Av. América",
        "calleSecundaria": null
      }
    },
    "factura": {
      "numero": "001-001-000000004",
      "secuencial": 4,
      "establecimiento": "001",
      "puntoEmision": "001",
      "tipo": "factura",
      "tipoIdentificacion": "consumidor_final",
      "identificacion": "9999999999999",
      "razonSocial": "Cliente Prueba",
      "subtotal": 450,
      "ivaPorcentaje": 15,
      "ivaValor": 69,
      "total": 529,
      "estado": "emitida",
      "claveAcceso": "1011202601999999999999910010010000000044437643067",
      "fechaEmision": "2026-11-10T21:48:48.556Z"
    },
    "historial": [
      {
        "estadoAnterior": null,
        "estadoNuevo": "pagado",
        "comentario": "Pedido creado con pago aprobado (tarjeta simulada).",
        "usuario": {
          "id": 2,
          "nombre": "Cliente Prueba"
        },
        "createdAt": "2026-11-10T21:48:48.537Z"
      },
      {
        "estadoAnterior": "pagado",
        "estadoNuevo": "preparando",
        "comentario": "Ejemplo de la evidencia",
        "usuario": {
          "id": 1,
          "nombre": "Admin Carresol"
        },
        "createdAt": "2026-11-10T21:48:48.628Z"
      }
    ]
  }
}
```

## Admin crea proveedor (módulo de compras)

```http
POST /api/proveedores
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json

{
  "nombre": "Distribuidora Ejemplo S.A.",
  "ruc": "1734732863302",
  "email": "ventas@dist-ejemplo.com",
  "telefono": "022334455"
}
```

```json
{
  "status": 201,
  "ok": true,
  "data": {
    "id": 3,
    "nombre": "Distribuidora Ejemplo S.A.",
    "ruc": "1734732863302",
    "email": "ventas@dist-ejemplo.com",
    "telefono": "022334455",
    "direccion": null,
    "contacto": null,
    "activo": true,
    "createdAt": "2026-11-10T21:48:48.650Z"
  }
}
```

## Recepción de compra (suma stock una sola vez + movimientos de inventario)

```http
PATCH /api/compras/3/estado
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json

{
  "estado": "recibida"
}
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "id": 3,
    "numeroCompra": 3,
    "proveedorId": 3,
    "proveedor": {
      "id": 3,
      "nombre": "Distribuidora Ejemplo S.A.",
      "ruc": "1734732863302"
    },
    "usuario": {
      "id": 1,
      "nombre": "Admin Carresol",
      "email": "admin@carresol.com"
    },
    "estado": "recibida",
    "numeroFacturaProveedor": null,
    "subtotal": 9,
    "ivaPorcentaje": 15,
    "ivaValor": 1.35,
    "total": 10.35,
    "moneda": "USD",
    "fechaCompra": "2026-11-10T21:48:48.686Z",
    "fechaRecepcion": "2026-11-10T21:48:48.767Z",
    "notas": null,
    "createdAt": "2026-11-10T21:48:48.693Z",
    "items": [
      {
        "id": 4,
        "varianteId": 1,
        "sku": "REL-IMP-ORO",
        "nombreProducto": "Reloj Carresol Imperial",
        "cantidad": 2,
        "costoUnitario": 4.5,
        "subtotal": 9,
        "stockActual": 15
      }
    ]
  }
}
```

## Inventario: variantes en stock mínimo

```http
GET /api/inventario/stock-bajo
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json
```

```json
{
  "status": 200,
  "ok": true,
  "data": [
    {
      "id": 41,
      "sku": "REL-PRO-SMO-TES-ACE-NICA-WDEI",
      "nombreProducto": "Producto Smoke Test",
      "categoria": "relojes",
      "material": "Acero inoxidable",
      "medida": "Única",
      "stock": 1,
      "stockMinimo": 3,
      "sugerido": 10
    }
  ]
}
```

## Auditoría (últimas 5 filas)

```http
GET /api/admin/auditoria?limit=5
Authorization: Bearer <JWT_OMITIDO>
Content-Type: application/json
```

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "total": 35,
    "page": 1,
    "limit": 5,
    "filas": [
      {
        "id": 35,
        "tabla": "compras",
        "registroId": "3",
        "accion": "UPDATE",
        "datosAnteriores": {
          "id": 3,
          "notas": null,
          "total": 10.35,
          "estado": "ordenada",
          "moneda": "USD",
          "ivaValor": 1.35,
          "subtotal": 9,
          "createdAt": "2026-11-10T21:48:48.693Z",
          "updatedAt": "2026-11-10T21:48:48.725Z",
          "usuarioId": 1,
          "fechaCompra": "2026-11-10T21:48:48.686Z",
          "proveedorId": 3,
          "numeroCompra": 3,
          "ivaPorcentaje": 15,
          "fechaRecepcion": null,
          "numeroFacturaProveedor": null
        },
        "datosNuevos": {
          "id": 3,
          "notas": null,
          "total": 10.35,
          "estado": "recibida",
          "moneda": "USD",
          "ivaValor": 1.35,
          "subtotal": 9,
          "createdAt": "2026-11-10T21:48:48.693Z",
          "updatedAt": "2026-11-10T21:48:48.775Z",
          "usuarioId": 1,
          "fechaCompra": "2026-11-10T21:48:48.686Z",
          "proveedorId": 3,
          "numeroCompra": 3,
          "ivaPorcentaje": 15,
          "fechaRecepcion": "2026-11-10T21:48:48.767Z",
          "numeroFacturaProveedor": null
        },
        "usuario": {
          "id": 1,
          "nombre": "Admin Carresol",
          "email": "admin@carresol.com"
        },
        "createdAt": "2026-11-10T21:48:48.778Z"
      },
      {
        "id": 34,
        "tabla": "variantes",
        "registroId": "1",
        "accion": "UPDATE",
        "datosAnteriores": {
          "id": 1,
          "sku": "REL-IMP-ORO",
          "costo": 5,
          "stock": 13,
          "activo": true,
          "medida": "Única",
          "precio": 450,
          "createdAt": "2026-11-10T21:47:29.700Z",
          "updatedAt": "2026-11-10T21:48:48.499Z",
          "materialId": 2,
          "pesoGramos": 13,
          "productoId": 1,
          "tipoMedida": "unica",
          "stockMinimo": 3
        },
        "datosNuevos": {
          "id": 1,
          "sku": "REL-IMP-ORO",
          "costo": 4.5,
          "stock": 15,
          "activo": true,
          "medida": "Única",
          "precio": 450,
          "createdAt": "2026-11-10T21:47:29.700Z",
          "updatedAt": "2026-11-10T21:48:48.764Z",
          "materialId": 2,
          "pesoGramos": 13,
          "productoId": 1,
          "tipoMedida": "unica",
          "stockMinimo": 3
        },
        "usuario": {
          "id": 1,
          "nombre": "Admin Carresol",
          "email": "admin@carresol.com"
        },
        "createdAt": "2026-11-10T21:48:48.767Z"
      },
      "… (5 elementos en total)"
    ]
  }
}
```

## Contacto público (sin sesión)

```http
POST /api/contacto
Content-Type: application/json

{
  "nombre": "Visitante Ejemplo",
  "email": "visitante@correo.com",
  "mensaje": "Mensaje de ejemplo para la evidencia de endpoints."
}
```

```json
{
  "status": 201,
  "ok": true,
  "data": {
    "id": 2,
    "nombre": "Visitante Ejemplo",
    "email": "visitante@correo.com",
    "telefono": null,
    "mensaje": "Mensaje de ejemplo para la evidencia de endpoints.",
    "canalPreferido": "email",
    "leido": false,
    "leidoAt": null,
    "createdAt": "2026-11-10T21:48:48.814Z",
    "usuario": null
  }
}
```

## Error consistente de recurso inexistente (sin stacktrace)

```http
GET /api/productos/999999999
Content-Type: application/json
```

```json
{
  "status": 404,
  "ok": false,
  "error": {
    "codigo": "NO_ENCONTRADO",
    "mensaje": "Producto no encontrado."
  }
}
```

