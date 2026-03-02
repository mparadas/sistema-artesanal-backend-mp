const fs = require('fs');
const path = require('path');

async function agregarHeadersCORSUpload() {
    try {
        console.log('🔧 Agregando headers CORS específicos para upload...\n');
        
        // Leer el archivo server.js
        const serverContent = fs.readFileSync('server.js', 'utf8');
        
        // Encontrar el endpoint de upload
        const uploadStart = serverContent.indexOf('app.post(\'/api/uploads/productos\'');
        if (uploadStart === -1) {
            console.log('❌ Endpoint upload no encontrado');
            return;
        }
        
        // Encontrar el try block del upload
        const tryStart = serverContent.indexOf('try {', uploadStart);
        if (tryStart === -1) {
            console.log('❌ Try block no encontrado');
            return;
        }
        
        // Insertar headers CORS después del try {
        const beforeHeaders = serverContent.substring(0, tryStart + 6); // después de 'try {'
        const afterHeaders = serverContent.substring(tryStart + 6);
        
        const headersCode = `
        // Headers CORS específicos para upload
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        `;
        
        const newContent = beforeHeaders + headersCode + afterHeaders;
        
        // Escribir el archivo modificado
        fs.writeFileSync('server.js', newContent);
        
        console.log('✅ Headers CORS agregados al endpoint upload');
        console.log('📋 Headers agregados:');
        console.log('  - Access-Control-Allow-Origin: *');
        console.log('  - Access-Control-Allow-Methods: POST, OPTIONS');
        console.log('  - Access-Control-Allow-Headers: Content-Type, Authorization');
        console.log('  - Access-Control-Allow-Credentials: true');
        
        console.log('\n✅ Modificación completada');
        
    } catch (error) {
        console.error('❌ Error agregando headers CORS:', error);
    }
}

agregarHeadersCORSUpload();
