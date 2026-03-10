const fs = require('fs');
const path = require('path');

async function diagnosticarUploadEndpoint() {
    try {
        console.log('🔍 Diagnosticando endpoint de upload...\n');
        
        // 1. Verificar si el endpoint existe en server.js
        console.log('📋 Buscando endpoint /api/uploads/productos en server.js...');
        const serverContent = fs.readFileSync('server.js', 'utf8');
        
        if (serverContent.includes('app.post(\'/api/uploads/productos\'')) {
            console.log('✅ Endpoint encontrado en server.js');
        } else {
            console.log('❌ Endpoint NO encontrado en server.js');
        }
        
        // 2. Verificar directorios de uploads
        console.log('\n📁 Verificando directorios...');
        const uploadsDir = path.join(__dirname, 'uploads');
        const productosDir = path.join(uploadsDir, 'productos');
        
        console.log(`  - uploads: ${fs.existsSync(uploadsDir) ? '✅ Existe' : '❌ No existe'}`);
        console.log(`  - uploads/productos: ${fs.existsSync(productosDir) ? '✅ Existe' : '❌ No existe'}`);
        
        // 3. Verificar permisos de escritura
        if (fs.existsSync(productosDir)) {
            try {
                const testFile = path.join(productosDir, 'test-write.txt');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                console.log('✅ Permisos de escritura OK');
            } catch (error) {
                console.log('❌ Error de permisos de escritura:', error.message);
            }
        }
        
        // 4. Verificar middleware de autenticación
        console.log('\n🔐 Verificando middleware de autenticación...');
        if (serverContent.includes('authenticateToken')) {
            console.log('✅ Middleware authenticateToken encontrado');
        } else {
            console.log('❌ Middleware authenticateToken NO encontrado');
        }
        
        // 5. Verificar límites de payload
        console.log('\n📏 Verificando límites de payload...');
        if (serverContent.includes('express.json')) {
            console.log('✅ Middleware express.json encontrado');
            const limitMatch = serverContent.match(/express\.json\(\s*{\s*limit:\s*['"`]([^'"`]+)['"`]/);
            if (limitMatch) {
                console.log(`  - Límite actual: ${limitMatch[1]}`);
            } else {
                console.log('  - Sin límite específico encontrado');
            }
        }
        
        // 6. Verificar CORS
        console.log('\n🌐 Verificando configuración CORS...');
        if (serverContent.includes('cors')) {
            console.log('✅ Middleware CORS encontrado');
        } else {
            console.log('❌ Middleware CORS NO encontrado');
        }
        
        console.log('\n✅ Diagnóstico completado');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

diagnosticarUploadEndpoint();
