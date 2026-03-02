const fs = require('fs');
const path = require('path');

async function verificarCORSyUpload() {
    try {
        console.log('🔍 Verificando configuración CORS y upload...\n');
        
        // 1. Verificar configuración CORS actual
        console.log('🌐 Configuración CORS actual:');
        const serverContent = fs.readFileSync('server.js', 'utf8');
        
        const corsMatch = serverContent.match(/cors\(\s*({[\s\S]*?})\s*\)/);
        if (corsMatch) {
            console.log('✅ Configuración CORS encontrada');
            console.log('  - Orígenes permitidos:');
            
            const originsMatch = corsMatch[1].match(/origin:\s*\[([\s\S]*?)\]/);
            if (originsMatch) {
                const origins = originsMatch[1].split(',').map(o => o.trim().replace(/['"`]/g, ''));
                origins.forEach(origin => {
                    console.log(`    * ${origin}`);
                });
            }
        }
        
        // 2. Verificar si necesitamos agregar el origen del frontend
        console.log('\n🔍 Verificando orígenes necesarios:');
        const requiredOrigins = [
            'https://sistema-artesanal-frontend-mp.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000'
        ];
        
        requiredOrigins.forEach(origin => {
            if (serverContent.includes(origin)) {
                console.log(`✅ ${origin} - Ya configurado`);
            } else {
                console.log(`❌ ${origin} - NO configurado`);
            }
        });
        
        // 3. Verificar límite actualizado
        console.log('\n📏 Límite de payload actual:');
        const limitMatch = serverContent.match(/express\.json\(\s*{\s*limit:\s*['"`]([^'"`]+)['"`]/);
        if (limitMatch) {
            console.log(`✅ Límite actual: ${limitMatch[1]}`);
        }
        
        // 4. Verificar headers CORS en respuesta de upload
        console.log('\n📤 Verificando headers del endpoint upload:');
        const uploadSection = serverContent.substring(
            serverContent.indexOf('app.post(\'/api/uploads/productos\''),
            serverContent.indexOf('app.post(\'/api/uploads/productos\'') + 1000
        );
        
        if (uploadSection.includes('res.header')) {
            console.log('✅ Headers CORS personalizados encontrados en upload');
        } else {
            console.log('❌ No hay headers CORS personalizados en upload');
        }
        
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando CORS:', error);
    }
}

verificarCORSyUpload();
