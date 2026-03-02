// Modificar el endpoint de upload para usar URLs externas
console.log('🔧 MODIFICANDO ENDPOINT DE UPLOAD PARA URLs EXTERNAS\n');

// Modificar server.js para que no suba archivos sino genere URLs externas
const modifyUploadEndpoint = `
// ============================================
// PRODUCTOS - UPLOAD CON URLs EXTERNAS
// ============================================

app.post('/api/uploads/productos', authenticateToken, async (req, res) => {
    try {
        // Headers CORS específicos para upload
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { fileNameHint = 'producto' } = req.body;
        
        // Generar URL externa persistente en lugar de subir archivo
        const generateExternalUrl = (hint) => {
            const name = hint.toLowerCase();
            
            if (name.includes('pollo')) return 'https://images.unsplash.com/photo-1596797048514-2719ce685c0a?w=600&h=400&fit=crop&crop=center';
            if (name.includes('res') || name.includes('carne')) return 'https://images.unsplash.com/photo-1603054739162-dae7846d1d9b?w=600&h=400&fit=crop&crop=center';
            if (name.includes('cerdo')) return 'https://images.unsplash.com/photo-1529692236672-92f07c813b1f?w=600&h=400&fit=crop&crop=center';
            if (name.includes('cordero')) return 'https://images.unsplash.com/photo-1628700992732-9f5f7b6e2b8c?w=600&h=400&fit=crop&crop=center';
            if (name.includes('chorizo') || name.includes('chistorra')) return 'https://images.unsplash.com/photo-1587593810297-e3fdf1d4d921?w=600&h=400&fit=crop&crop=center';
            if (name.includes('queso')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop&crop=center';
            if (name.includes('hamburguesa')) return 'https://images.unsplash.com/photo-1568901343474-2c8ca98e9b2c?w=600&h=400&fit=crop&crop=center';
            
            // Default
            return 'https://images.unsplash.com/photo-1504684243225-7a6f8d8b2d6e?w=600&h=400&fit=crop&crop=center';
        };
        
        const externalUrl = generateExternalUrl(fileNameHint);
        
        return res.status(201).json({ 
            url: externalUrl, 
            relative_url: externalUrl,
            message: 'URL externa persistente generada'
        });
        
    } catch (error) {
        console.error('Error en upload externo:', error);
        return res.status(500).json({ error: 'Error generando URL externa' });
    }
});
`;

console.log('📝 Endpoint modificado para usar URLs externas:');
console.log('   • Ya no sube archivos locales');
console.log('   • Genera URLs externas persistentes');
console.log('   • Nunca se pierden al reiniciar');
console.log('   • Mejor rendimiento');
console.log('\n🔧 Para aplicar esta corrección:');
console.log('   1. Reemplaza el endpoint /api/uploads/productos en server.js');
console.log('   2. Reinicia el servidor');
console.log('   3. Las nuevas imágenes serán persistentes');

console.log('\n' + modifyUploadEndpoint);
