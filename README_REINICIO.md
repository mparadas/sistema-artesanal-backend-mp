# 🧹 Reinicio de Tablas Principales - Sistema Artesanal

## 📋 Propósito
Este conjunto de scripts permite reiniciar las tablas principales del sistema para una entrega limpia al cliente, manteniendo la estructura de la base de datos.

## 🗃️ Tablas que se Reiniciarán

### Tablas Principales (Se limpiarán completamente):
- **ventas** - Todas las ventas registradas
- **productos** - Todos los productos del catálogo
- **pagos** - Todos los pagos y abonos

### Tablas que se Mantendrán (No se modifican):
- **clientes** - Todos los clientes registrados
- **tasas_cambio** - Historial y tasas configuradas
- **usuarios** - Usuarios del sistema y accesos
- **categorias** - Categorías de productos

## 🚀 Métodos de Ejecución

### Opción 1: Script Automatizado (Recomendado)
```bash
# En la carpeta backend
node ejecutar_reinicio.js
```

### Opción 2: SQL Directo
```bash
# Conectarse a PostgreSQL y ejecutar
psql -h localhost -U postgres -d sistema_artesanal -f reiniciar_tablas_principales.sql
```

### Opción 3: Con Backup Previo
```bash
# 1. Crear backup primero
psql -h localhost -U postgres -d sistema_artesanal -f backup_antes_reinicio.sql

# 2. Luego ejecutar reinicio
psql -h localhost -U postgres -d sistema_artesanal -f reiniciar_tablas_principales.sql
```

## 📊 Estado Después del Reinicio

### Datos Limpios:
- **Ventas**: 0 registros
- **Productos**: 0 registros  
- **Pagos**: 0 registros

### Datos Preservados (Sin cambios):
- **Clientes**: Todos los registros existentes
- **Tasas de cambio**: Todas las tasas configuradas
- **Usuarios**: Todos los usuarios del sistema
- **Categorías**: Todas las categorías existentes

## 🔐 Seguridad

### Backup Automático:
- El script `backup_antes_reinicio.sql` crea copias de seguridad
- Los datos se guardan en tablas con sufijo `_backup`
- Permite recuperación si es necesario

### Transacciones Seguras:
- Todas las operaciones usan `BEGIN/COMMIT`
- Si hay error, se hace rollback automático
- No deja la base de datos en estado inconsistente

## ⚠️ Advertencias

### Antes de Ejecutar:
1. **Hacer backup completo** de la base de datos
2. **Confirmar que no hay datos importantes** que necesiten conservarse
3. **Cerrar todas las conexiones activas** al sistema

### Después de Ejecutar:
1. **Verificar que el sistema funcione** correctamente
2. **Probar creación de nuevas ventas**
3. **Configurar tasa de cambio actual** si es necesario

## 🛠️ Personalización

### Mantener Datos Específicos:
Si necesitas mantener ciertos datos en las tablas principales, modifica el script `reiniciar_tablas_principales.sql`:

```sql
-- Ejemplo: Mantener ventas específicas
DELETE FROM ventas WHERE id NOT IN (1, 2, 3);

-- Ejemplo: Mantener productos base
DELETE FROM productos WHERE categoria != 'base';
```

### Tablas Siempre Preservadas:
Las siguientes tablas NUNCA se modifican:
- **clientes** - Datos de clientes intactos
- **tasas_cambio** - Configuración de monedas intacta
- **usuarios** - Accos al sistema intactos
- **categorias** - Clasificaciones intactas

## 📞 Soporte

Si tienes problemas durante el proceso:
1. Verifica la conexión a la base de datos
2. Confirma que tienes los permisos necesarios
3. Revisa el log de errores del script
4. Restaura desde el backup si es necesario

## ✅ Verificación Final

Después del reinicio, el sistema debe:
- [ ] Cargar sin errores
- [ ] Mantener clientes existentes accesibles
- [ ] Permitir crear nuevos productos
- [ ] Permitir registrar ventas nuevas
- [ ] Mostrar tasas de cambio configuradas
- [ ] Funcionar conversión de moneda
- [ ] Mantener usuarios y accesos del sistema
- [ ] Conservar categorías existentes
