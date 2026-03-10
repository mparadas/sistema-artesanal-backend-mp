const { obtenerTasaDiaria } = require('./services/tasa_bcv_service');

async function testTasaAPI() {
  try {
    console.log('🔍 Probando obtención de tasa...');
    
    const tasa = await obtenerTasaDiaria();
    
    console.log('✅ Tasa obtenida exitosamente:');
    console.log('   Tasa:', tasa.tasa);
    console.log('   Fecha:', tasa.fecha);
    console.log('   Fuente:', tasa.fuente);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTasaAPI();
