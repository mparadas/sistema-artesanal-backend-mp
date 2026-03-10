const fs = require('fs');
const path = require('path');

async function testUploadEndpoint() {
    try {
        console.log('🔍 Probando endpoint de upload de imágenes...\n');
        
        // Simular una petición de upload
        const { default: fetch } = await import('node-fetch');
        
        // Crear una imagen de prueba (base64)
        const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        // Extraer solo el base64
        const base64Data = testImageData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Crear FormData simulado
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', buffer, {
            filename: 'test-image.png',
            contentType: 'image/png'
        });
        
        console.log('📤 Enviando petición de upload...');
        
        const response = await fetch('https://agromae-b.onrender.com/api/uploads/productos', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer test-token',
                ...form.getHeaders()
            },
            body: form
        });
        
        const result = await response.json();
        
        console.log('📊 Respuesta del endpoint:');
        console.log('  - Status:', response.status);
        console.log('  - Result:', JSON.stringify(result, null, 2));
        
        if (response.ok && result.url) {
            console.log('✅ Upload endpoint funciona correctamente');
            
            // Probar si la imagen es accesible
            console.log('\n🔍 Probando acceso a la imagen subida...');
            const imageResponse = await fetch(result.url);
            console.log('  - Status de imagen:', imageResponse.status);
            
            if (imageResponse.ok) {
                console.log('✅ Imagen accesible correctamente');
            } else {
                console.log('❌ Imagen no accesible - posible problema CORS');
            }
        } else {
            console.log('❌ Upload endpoint tiene problemas');
        }
        
    } catch (error) {
        console.error('❌ Error probando upload:', error.message);
    }
}

testUploadEndpoint();
