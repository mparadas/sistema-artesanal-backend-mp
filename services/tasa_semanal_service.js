// Servicio para manejar tasas de cambio con lógica de fines de semana
// Sábado y domingo usan la tasa del viernes más reciente

class TasaSemanalService {
  constructor() {
    this.tasaPorDefecto = 40.00;
  }

  // Determinar si es fin de semana
  esFinDeSemana(fecha = new Date()) {
    const dia = fecha.getDay();
    return dia === 0 || dia === 6; // 0 = Domingo, 6 = Sábado
  }

  // Obtener el viernes más reciente
  obtenerViernesMasReciente(fecha = new Date()) {
    const viernes = new Date(fecha);
    const dia = fecha.getDay();
    
    if (dia === 0) { // Domingo
      viernes.setDate(viernes.getDate() - 2); // Retroceder 2 días al viernes
    } else if (dia === 6) { // Sábado
      viernes.setDate(viernes.getDate() - 1); // Retroceder 1 día al viernes
    }
    
    return viernes.toISOString().split('T')[0];
  }

  // Obtener la tasa vigente según la lógica de fines de semana
  async obtenerTasaVigente(db, fecha = new Date()) {
    try {
      const fechaActual = fecha.toISOString().split('T')[0];
      let fechaBusqueda = fechaActual;
      
      // Si es fin de semana, buscar la tasa del viernes más reciente
      if (this.esFinDeSemana(fecha)) {
        fechaBusqueda = this.obtenerViernesMasReciente(fecha);
        console.log('📅 Fin de semana detectado, usando tasa del viernes:', fechaBusqueda);
      }
      
      // Buscar tasa para la fecha determinada
      const result = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY creado_en DESC LIMIT 1',
        [fechaBusqueda]
      );
      
      if (result.rows.length > 0) {
        const tasa = result.rows[0];
        return {
          tasa: parseFloat(tasa.tasa_bcv),
          fecha: tasa.fecha,
          fuente: tasa.fuente,
          es_hoy: tasa.fecha === fechaActual,
          es_viernes_aplicable: tasa.fecha !== fechaActual && this.esFinDeSemana(fecha),
          fecha_aplicable: fechaActual
        };
      }
      
      // Si no hay tasa para el viernes, buscar la más reciente
      const resultReciente = await db.query(
        'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC LIMIT 1',
        []
      );
      
      if (resultReciente.rows.length > 0) {
        const tasa = resultReciente.rows[0];
        return {
          tasa: parseFloat(tasa.tasa_bcv),
          fecha: tasa.fecha,
          fuente: tasa.fuente,
          es_hoy: false,
          es_viernes_aplicable: this.esFinDeSemana(fecha),
          fecha_aplicable: fechaActual,
          nota: 'Usando tasa más reciente disponible'
        };
      }
      
      // Si no hay ninguna tasa, usar valor por defecto
      return {
        tasa: this.tasaPorDefecto,
        fecha: fechaBusqueda,
        fuente: 'Valor por defecto del sistema',
        es_hoy: false,
        es_viernes_aplicable: this.esFinDeSemana(fecha),
        fecha_aplicable: fechaActual,
        nota: 'Sin tasas registradas, usando valor por defecto'
      };
      
    } catch (error) {
      console.error('Error obteniendo tasa vigente:', error);
      return {
        tasa: this.tasaPorDefecto,
        fecha: new Date().toISOString().split('T')[0],
        fuente: 'Error del sistema - valor por defecto',
        es_hoy: false,
        es_viernes_aplicable: this.esFinDeSemana(fecha),
        fecha_aplicable: fecha.toISOString().split('T')[0]
      };
    }
  }

  // Obtener todas las tasas de la semana actual
  async obtenerTasasSemana(db) {
    try {
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      
      // Encontrar el lunes de esta semana
      const dia = hoy.getDay();
      const diasParaLunes = dia === 0 ? 6 : dia - 1; // Si es domingo, retroceder 6 días
      inicioSemana.setDate(hoy.getDate() - diasParaLunes);
      
      const result = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha >= $1 AND fecha <= $2 AND activa = true ORDER BY fecha',
        [inicioSemana.toISOString().split('T')[0], hoy.toISOString().split('T')[0]]
      );
      
      return result.rows.map(tasa => ({
        ...tasa,
        tasa_bcv: parseFloat(tasa.tasa_bcv)
      }));
      
    } catch (error) {
      console.error('Error obteniendo tasas de la semana:', error);
      return [];
    }
  }

  // Verificar si se necesita actualizar la tasa del viernes
  necesitaActualizarTasaViernes(db) {
    return new Promise(async (resolve) => {
      try {
        if (!this.esFinDeSemana()) {
          resolve({ necesita: false, motivo: 'No es fin de semana' });
          return;
        }
        
        const viernes = this.obtenerViernesMasReciente();
        const result = await db.query(
          'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true',
          [viernes]
        );
        
        if (result.rows.length === 0) {
          resolve({ 
            necesita: true, 
            motivo: 'No hay tasa registrada para el viernes',
            viernes: viernes
          });
        } else {
          resolve({ 
            necesita: false, 
            motivo: 'Tasa del viernes ya registrada',
            viernes: viernes,
            tasa_actual: parseFloat(result.rows[0].tasa_bcv)
          });
        }
        
      } catch (error) {
        console.error('Error verificando si necesita actualizar tasa:', error);
        resolve({ necesita: false, motivo: 'Error en verificación' });
      }
    });
  }

  // Obtener resumen semanal para dashboard
  async obtenerResumenSemanal(db) {
    try {
      const hoy = new Date();
      const lunes = new Date(hoy);
      const viernes = new Date(hoy);
      
      // Encontrar lunes y viernes de esta semana
      const dia = hoy.getDay();
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
      viernes.setDate(hoy.getDate() + (5 - (dia === 0 ? 6 : dia - 1)));
      
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_tasas,
          AVG(tasa_bcv) as promedio,
          MAX(tasa_bcv) as maximo,
          MIN(tasa_bcv) as minimo,
          MAX(fecha) as ultima_actualizacion
        FROM tasas_cambio 
        WHERE fecha >= $1 AND fecha <= $2 AND activa = true`,
        [lunes.toISOString().split('T')[0], viernes.toISOString().split('T')[0]]
      );
      
      const stats = result.rows[0];
      
      return {
        semana: {
          lunes: lunes.toISOString().split('T')[0],
          viernes: viernes.toISOString().split('T')[0]
        },
        total_tasas: parseInt(stats.total_tasas) || 0,
        promedio: parseFloat(stats.promedio) || 0,
        maximo: parseFloat(stats.maximo) || 0,
        minimo: parseFloat(stats.minimo) || 0,
        ultima_actualizacion: stats.ultima_actualizacion,
        es_fin_de_semana: this.esFinDeSemana(hoy),
        tasa_vigente: await this.obtenerTasaVigente(db)
      };
      
    } catch (error) {
      console.error('Error obteniendo resumen semanal:', error);
      return null;
    }
  }
}

module.exports = new TasaSemanalService();
