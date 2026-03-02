// Obtener datos de la venta 5 para pruebas
console.log('🔍 Obteniendo datos de la venta 5...\n');

const API_URL = 'https://agromae-b.onrender.com/api';

async function obtenerVenta5() {
  try {
    console.log('📡 Conectando a:', `${API_URL}/ventas/5`);
    
    const response = await fetch(`${API_URL}/ventas/5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Estado: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const venta = await response.json();
      
      console.log('\n✅ VENTA 5 ENCONTRADA:');
      console.log('=====================');
      console.log(`🆔 ID: ${venta.id}`);
      console.log(`👤 Cliente: ${venta.cliente_nombre || 'N/A'}`);
      console.log(`📅 Fecha: ${venta.fecha || 'N/A'}`);
      console.log(`💰 Total: ${venta.total || 0}`);
      console.log(`📊 Estado: ${venta.estado || 'N/A'}`);
      console.log(`💳 Método pago: ${venta.metodo_pago || 'N/A'}`);
      console.log(`📝 Notas: ${venta.notas || 'N/A'}`);
      
      if (venta.detalles && Array.isArray(venta.detalles)) {
        console.log('\n📦 DETALLES DE LA VENTA:');
        console.log('=======================');
        venta.detalles.forEach((detalle, index) => {
          console.log(`${index + 1}. ${detalle.producto_nombre || 'N/A'}`);
          console.log(`   Cantidad: ${detalle.cantidad || 0}`);
          console.log(`   Precio unit: ${detalle.precio_unitario || 0}`);
          console.log(`   Subtotal: ${detalle.subtotal || 0}`);
          console.log('');
        });
      }
      
      if (venta.abonos && Array.isArray(venta.abonos)) {
        console.log('💳 ABONOS REGISTRADOS:');
        console.log('=====================');
        venta.abonos.forEach((abono, index) => {
          console.log(`${index + 1}. ${abono.fecha || 'N/A'} - ${abono.monto || 0} (${abono.metodo_pago || 'N/A'})`);
        });
      }
      
      console.log('\n🔧 DATOS COMPLETOS PARA PRUEBAS:');
      console.log('==================================');
      console.log(JSON.stringify(venta, null, 2));
      
      return venta;
      
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${response.status}`);
      console.log(`📄 Detalle: ${errorText}`);
      return null;
    }
    
  } catch (error) {
    console.log(`💥 Error de conexión: ${error.message}`);
    return null;
  }
}

// También obtener lista de todas las ventas para ver IDs disponibles
async function obtenerTodasLasVentas() {
  try {
    console.log('\n📋 Obteniendo lista de todas las ventas...');
    
    const response = await fetch(`${API_URL}/ventas`);
    
    if (response.ok) {
      const ventas = await response.json();
      
      console.log(`📊 Total de ventas: ${ventas.length}`);
      console.log('\n📋 LISTA DE VENTAS DISPONIBLES:');
      console.log('==============================');
      
      ventas.forEach((venta, index) => {
        console.log(`${index + 1}. ID: ${venta.id} - ${venta.cliente_nombre || 'Sin cliente'} - ${venta.total || 0} - ${venta.estado || 'N/A'}`);
      });
      
      return ventas;
    }
  } catch (error) {
    console.log(`❌ Error obteniendo lista: ${error.message}`);
    return [];
  }
}

// Ejecutar ambas funciones
async function main() {
  await obtenerTodasLasVentas();
  await obtenerVenta5();
}

main();
