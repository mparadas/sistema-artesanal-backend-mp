// Servicio simple para gestión de tasas de cambio
// Funciona sin depender de APIs externas

class TasaService {
  constructor() {
    this.tasaPorDefecto = 40.00;
  this.fuentesDisponibles = [
      'BCV - Banco Central de Venezuela',
      'Paralelo - Mercado informal',
      'DolarToday - Portal web',
      'MonitorDolar - Web oficial',
      'Manual - Ingresada por usuario'
  ];
  }

  // Obtener tasa actual (prioriza la más reciente en BD)
  async obtenerTasaActual(db) {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      
      // Buscar tasa de hoy
      const result = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY creado_en DESC LIMIT 1',
        [fechaHoy]
      );
      
      if (result.rows.length > 0) {
        return {
          tasa: parseFloat(result.rows[0].tasa_bcv),
          fecha: result.rows[0].fecha,
          fuente: result.rows[0].fuente,
          es_hoy: true
        };
      }
      
      // Si no hay tasa hoy, buscar la más reciente
      const resultReciente = await db.query(
        'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC LIMIT 1'
      );
      
      if (resultReciente.rows.length > 0) {
        return {
          tasa: parseFloat(resultReciente.rows[0].tasa_bcv),
          fecha: resultReciente.rows[0].fecha,
          fuente: resultReciente.rows[0].fuente,
          es_hoy: false
        };
      }
      
      // Si no hay ninguna tasa, usar valor por defecto
      return {
        tasa: this.tasaPorDefecto,
        fecha: fechaHoy,
        fuente: 'Valor por defecto del sistema',
        es_hoy: false
      };
      
    } catch (error) {
      console.error('Error obteniendo tasa actual:', error);
      return {
        tasa: this.tasaPorDefecto,
        fecha: new Date().toISOString().split('T')[0],
        fuente: 'Error del sistema - valor por defecto',
        es_hoy: false
      };
    }
  }

  // Calcular promedio de tasas de un período
  async calcularPromedio(db, dias = 7) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);
      
      const result = await db.query(
        'SELECT AVG(tasa_bcv) as promedio, COUNT(*) as total FROM tasas_cambio WHERE fecha >= $1 AND activa = true',
        [fechaLimite.toISOString().split('T')[0]]
      );
      
      if (result.rows[0].total > 0) {
        return {
          promedio: parseFloat(result.rows[0].promedio),
          total: parseInt(result.rows[0].total)
        };
      }
      
      return { promedio: this.tasaPorDefecto, total: 0 };
      
    } catch (error) {
      console.error('Error calculando promedio:', error);
      return { promedio: this.tasaPorDefecto, total: 0 };
    }
  }

  // Validar si una tasa es razonable
  validarTasa(tasa) {
    const tasaNumerica = parseFloat(tasa);
    
    // Validar que sea un número positivo
    if (isNaN(tasaNumerica) || tasaNumerica <= 0) {
      return { valida: false, error: 'La tasa debe ser un número positivo' };
    }
    
    // Validar rango razonable (entre 1 y 1000 BS/$)
    if (tasaNumerica < 1 || tasaNumerica > 1000) {
      return { 
        valida: false, 
        error: 'La tasa debe estar entre 1.00 y 1000.00 BS/$' 
      };
    }
    
    return { valida: true };
  }

  // Obtener estadísticas de tasas
  async obtenerEstadisticas(db, periodo = 'mes') {
    try {
      let fechaLimite;
      const ahora = new Date();
      
      switch (periodo) {
        case 'dia':
          fechaLimite = new Date(ahora);
          break;
        case 'semana':
          fechaLimite = new Date(ahora);
          fechaLimite.setDate(fechaLimite.getDate() - 7);
          break;
        case 'mes':
          fechaLimite = new Date(ahora);
          fechaLimite.setMonth(fechaLimite.getMonth() - 1);
          break;
        case 'año':
          fechaLimite = new Date(ahora);
          fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);
          break;
        default:
          fechaLimite = new Date(ahora);
          fechaLimite.setMonth(fechaLimite.getMonth() - 1);
      }
      
      const result = await db.query(
        `SELECT 
          COUNT(*) as total,
          AVG(tasa_bcv) as promedio,
          MAX(tasa_bcv) as maximo,
          MIN(tasa_bcv) as minimo,
          STDDEV(tasa_bcv) as desviacion
        FROM tasas_cambio 
        WHERE fecha >= $1 AND activa = true`,
        [fechaLimite.toISOString().split('T')[0]]
      );
      
      const stats = result.rows[0];
      
      return {
        periodo,
        total: parseInt(stats.total) || 0,
        promedio: parseFloat(stats.promedio) || this.tasaPorDefecto,
        maximo: parseFloat(stats.maximo) || this.tasaPorDefecto,
        minimo: parseFloat(stats.minimo) || this.tasaPorDefecto,
        desviacion: parseFloat(stats.desviacion) || 0
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        periodo,
        total: 0,
        promedio: this.tasaPorDefecto,
        maximo: this.tasaPorDefecto,
        minimo: this.tasaPorDefecto,
        desviacion: 0
      };
    }
  }

  // Sugerir tasa basada en tendencias
  async sugerirTasa(db) {
    try {
      const stats = await this.obtenerEstadisticas(db, 'semana');
      
      if (stats.total < 3) {
        // Si hay pocos datos, usar promedio del mes
        const statsMes = await this.obtenerEstadisticas(db, 'mes');
        return statsMes.promedio;
      }
      
      // Si hay suficiente data, usar promedio de la semana
      return stats.promedio;
      
    } catch (error) {
      console.error('Error sugiriendo tasa:', error);
      return this.tasaPorDefecto;
    }
  }
}

module.exports = new TasaService();
