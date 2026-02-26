// Servicio para manejar tasas de cambio con horario del BCV
// El BCV publica a las 4:00 PM hora de Venezuela y aplica al día siguiente hábil

class TasaBCVHorarioService {
  constructor() {
    this.tasaPorDefecto = 40.00;
    this.horaPublicacionBCV = 16; // 4:00 PM en formato 24h
    this.zonaHorariaVenezuela = -4; // GMT-4 (hora de Venezuela)
  }

  // Obtener fecha y hora actual en Venezuela
  obtenerFechaHoraVenezuela() {
    const ahora = new Date();
    // Ajustar a zona horaria de Venezuela (GMT-4)
    const fechaVenezuela = new Date(ahora.getTime() + (ahora.getTimezoneOffset() * 60000) + (this.zonaHorariaVenezuela * 3600000));
    return fechaVenezuela;
  }

  // Determinar si ya se publicó la tasa del BCV hoy (después de las 4 PM)
  yaSePublicoTasaHoy() {
    const fechaVenezuela = this.obtenerFechaHoraVenezuela();
    const horaActual = fechaVenezuela.getHours();
    return horaActual >= this.horaPublicacionBCV;
  }

  // Obtener la fecha de aplicación según el horario del BCV
  obtenerFechaAplicacion() {
    const fechaVenezuela = this.obtenerFechaHoraVenezuela();
    const yaPublicado = this.yaSePublicoTasaHoy();
    
    if (yaPublicado) {
      // Si ya se publicó hoy, la tasa aplica para mañana
      const manana = new Date(fechaVenezuela);
      manana.setDate(manana.getDate() + 1);
      return this.obtenerSiguienteDiaHabil(manana);
    } else {
      // Si aún no se publica hoy, la tasa actual aplica para hoy
      return this.obtenerDiaHabil(fechaVenezuela);
    }
  }

  // Obtener el siguiente día hábil (evita fines de semana)
  obtenerSiguienteDiaHabil(fecha) {
    const siguiente = new Date(fecha);
    const dia = siguiente.getDay();
    
    // Si es sábado (6), saltar al lunes
    if (dia === 6) {
      siguiente.setDate(siguiente.getDate() + 2);
    }
    // Si es domingo (0), saltar al lunes
    else if (dia === 0) {
      siguiente.setDate(siguiente.getDate() + 1);
    }
    
    return siguiente.toISOString().split('T')[0];
  }

  // Obtener día hábil (evita fines de semana)
  obtenerDiaHabil(fecha) {
    const dia = fecha.getDay();
    
    // Si es sábado (6), retroceder al viernes
    if (dia === 6) {
      const viernes = new Date(fecha);
      viernes.setDate(viernes.getDate() - 1);
      return viernes.toISOString().split('T')[0];
    }
    // Si es domingo (0), retroceder al viernes
    else if (dia === 0) {
      const viernes = new Date(fecha);
      viernes.setDate(viernes.getDate() - 2);
      return viernes.toISOString().split('T')[0];
    }
    
    return fecha.toISOString().split('T')[0];
  }

  // Determinar qué tasa debe estar vigente ahora
  async obtenerTasaVigente(db) {
    try {
      const fechaVenezuela = this.obtenerFechaHoraVenezuela();
      const fechaActual = fechaVenezuela.toISOString().split('T')[0];
      const horaActual = fechaVenezuela.getHours();
      const yaPublicado = this.yaSePublicoTasaHoy();
      const fechaAplicacion = this.obtenerFechaAplicacion();
      
      console.log('🕐 Análisis de horario BCV:', {
        fecha_venezuela: fechaVenezuela.toISOString(),
        hora_actual: horaActual,
        ya_publicado_hoy: yaPublicado,
        fecha_aplicacion: fechaAplicacion
      });
      
      // Buscar tasa para la fecha de aplicación
      const result = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY creado_en DESC LIMIT 1',
        [fechaAplicacion]
      );
      
      if (result.rows.length > 0) {
        const tasa = result.rows[0];
        return {
          tasa: parseFloat(tasa.tasa_bcv),
          fecha: tasa.fecha,
          fuente: tasa.fuente,
          fecha_aplicacion: fechaAplicacion,
          fecha_actual: fechaActual,
          hora_actual: horaActual,
          ya_publicado_hoy: yaPublicado,
          es_tasa_manana: yaPublicado,
          nota: yaPublicado ? 'Tasa publicada hoy, aplica para mañana' : 'Tasa publicada anteriormente, aplica hoy'
        };
      }
      
      // Si no hay tasa para la fecha de aplicación, buscar la más reciente
      const resultReciente = await db.query(
        'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC LIMIT 1'
      );
      
      if (resultReciente.rows.length > 0) {
        const tasa = resultReciente.rows[0];
        return {
          tasa: parseFloat(tasa.tasa_bcv),
          fecha: tasa.fecha,
          fuente: tasa.fuente,
          fecha_aplicacion: fechaAplicacion,
          fecha_actual: fechaActual,
          hora_actual: horaActual,
          ya_publicado_hoy: yaPublicado,
          es_tasa_manana: yaPublicado,
          nota: `Usando tasa más reciente (${tasa.fecha}) - ${yaPublicado ? 'esperando tasa de mañana' : 'tasa vigente de hoy'}`
        };
      }
      
      // Si no hay ninguna tasa, usar valor por defecto
      return {
        tasa: this.tasaPorDefecto,
        fecha: fechaAplicacion,
        fuente: 'Valor por defecto del sistema',
        fecha_aplicacion: fechaAplicacion,
        fecha_actual: fechaActual,
        hora_actual: horaActual,
        ya_publicado_hoy: yaPublicado,
        es_tasa_manana: yaPublicado,
        nota: 'Sin tasas registradas, usando valor por defecto'
      };
      
    } catch (error) {
      console.error('Error obteniendo tasa vigente con horario BCV:', error);
      return {
        tasa: this.tasaPorDefecto,
        fecha: new Date().toISOString().split('T')[0],
        fuente: 'Error del sistema - valor por defecto',
        nota: 'Error en el sistema'
      };
    }
  }

  // Obtener estado de publicación de hoy
  obtenerEstadoPublicacion() {
    const fechaVenezuela = this.obtenerFechaHoraVenezuela();
    const horaActual = fechaVenezuela.getHours();
    const yaPublicado = this.yaSePublicoTasaHoy();
    const horaPublicacion = this.horaPublicacionBCV;
    const minutosRestantes = yaPublicado ? 0 : (horaPublicacion * 60) - (horaActual * 60) - fechaVenezuela.getMinutes();
    
    return {
      fecha_actual: fechaVenezuela.toISOString().split('T')[0],
      hora_actual: `${fechaVenezuela.getHours().toString().padStart(2, '0')}:${fechaVenezuela.getMinutes().toString().padStart(2, '0')}`,
      hora_publicacion: `${horaPublicacion.toString().padStart(2, '0')}:00`,
      ya_publicado_hoy: yaPublicado,
      minutos_para_publicacion: Math.max(0, minutosRestantes),
      proxima_publicacion: yaPublicado ? 'mañana a las 4:00 PM' : `hoy a las 4:00 PM`
    };
  }

  // Determinar si se debe actualizar la tasa para mañana
  debeActualizarTasaManana(db) {
    return new Promise(async (resolve) => {
      try {
        const estado = this.obtenerEstadoPublicacion();
        const manana = new Date(this.obtenerFechaHoraVenezuela());
        manana.setDate(manana.getDate() + 1);
        const fechaManana = this.obtenerSiguienteDiaHabil(manana);
        
        if (!estado.ya_publicado_hoy) {
          resolve({ 
            debe_actualizar: false, 
            motivo: 'Aún no se ha publicado la tasa de hoy (antes de las 4:00 PM)',
            proxima_publicacion: estado.proxima_publicacion
          });
          return;
        }
        
        // Verificar si ya existe tasa para mañana
        const result = await db.query(
          'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true',
          [fechaManana]
        );
        
        if (result.rows.length === 0) {
          resolve({ 
            debe_actualizar: true, 
            motivo: 'Ya se publicó hoy y no hay tasa para mañana',
            fecha_manana: fechaManana
          });
        } else {
          resolve({ 
            debe_actualizar: false, 
            motivo: 'Tasa para mañana ya registrada',
            fecha_manana: fechaManana,
            tasa_existente: parseFloat(result.rows[0].tasa_bcv)
          });
        }
        
      } catch (error) {
        console.error('Error verificando si debe actualizar tasa:', error);
        resolve({ debe_actualizar: false, motivo: 'Error en verificación' });
      }
    });
  }
}

module.exports = new TasaBCVHorarioService();
