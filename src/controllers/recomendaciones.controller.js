const { query } = require('../config/database');

// Generar recomendación con IA (Claude)
const generarRecomendacion = async (req, res) => {
  try {
    const { evaluacion_id } = req.body;

    if (!evaluacion_id) {
      return res.status(400).json({
        success: false,
        error: 'El campo evaluacion_id es requerido'
      });
    }

    // Obtener la evaluación con datos del usuario
    const evalResult = await query(
      `SELECT e.*, u.nombre as usuario_nombre, u.area, u.puesto
       FROM evaluaciones e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.id = $1`,
      [evaluacion_id]
    );

    if (evalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación no encontrada'
      });
    }

    const evaluacion = evalResult.rows[0];

    // Construir el prompt para Claude con CBI
    const prompt = `Eres un experto en salud ocupacional especializado en síndrome de burnout.

Analiza los siguientes resultados del Copenhagen Burnout Inventory (CBI) y genera recomendaciones personalizadas.

DATOS DEL COLABORADOR:
- Nombre: ${evaluacion.usuario_nombre}
- Área: ${evaluacion.area || 'No especificada'}
- Puesto: ${evaluacion.puesto || 'No especificado'}

RESULTADOS CBI (escala 0-100):
- Burnout Personal (BP): ${evaluacion.puntaje_bp} - Nivel: ${evaluacion.nivel_bp}
- Burnout Laboral (BL): ${evaluacion.puntaje_bl} - Nivel: ${evaluacion.nivel_bl}
- Burnout por Cliente/Usuario (BC): ${evaluacion.puntaje_bc} - Nivel: ${evaluacion.nivel_bc}
- Clasificación General de Riesgo: ${evaluacion.nivel_riesgo}

INTERPRETACIÓN DE PUNTAJES CBI:
- Menos de 50: Bajo riesgo
- 50 a 74: Riesgo moderado
- 75 o más: Riesgo alto

Genera una respuesta en formato JSON con esta estructura exacta:
{
  "analisis_general": "Resumen del estado del colaborador",
  "nivel_urgencia": "ALTA|MEDIA|BAJA",
  "dimensiones": {
    "burnout_personal": {
      "interpretacion": "Explicación del puntaje",
      "senales_alerta": ["señal 1", "señal 2"]
    },
    "burnout_laboral": {
      "interpretacion": "Explicación del puntaje",
      "senales_alerta": ["señal 1", "señal 2"]
    },
    "burnout_cliente": {
      "interpretacion": "Explicación del puntaje",
      "senales_alerta": ["señal 1", "señal 2"]
    }
  },
  "recomendaciones_inmediatas": [
    {"accion": "Descripción", "responsable": "Quién debe hacerlo", "plazo": "Tiempo"}
  ],
  "recomendaciones_mediano_plazo": [
    {"accion": "Descripción", "responsable": "Quién debe hacerlo", "plazo": "Tiempo"}
  ],
  "tecnicas_autocuidado": ["técnica 1", "técnica 2", "técnica 3"],
  "seguimiento": {
    "proxima_evaluacion": "Cuándo reevaluar",
    "indicadores_mejora": ["indicador 1", "indicador 2"],
    "indicadores_empeoramiento": ["indicador 1", "indicador 2"]
  },
  "mensaje_personalizado": "Mensaje empático para el colaborador"
}

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;

    let recomendacionContenido;
    let tipoRecomendacion = 'IA';

    // Intentar llamar a la API de Anthropic
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error('Error en API de Anthropic');
      }

      const data = await response.json();
      const contenidoTexto = data.content[0].text;
      
      // Limpiar el JSON (quitar posibles backticks)
      const jsonLimpio = contenidoTexto.replace(/```json\n?|\n?```/g, '').trim();
      recomendacionContenido = JSON.parse(jsonLimpio);

    } catch (iaError) {
      console.error('Error con IA, usando sistema de respaldo:', iaError.message);
      
      // Sistema de respaldo basado en reglas
      tipoRecomendacion = 'REGLAS';
      recomendacionContenido = generarRecomendacionLocal(evaluacion);
    }

    // Guardar en la base de datos
    const result = await query(
      `INSERT INTO recomendaciones (evaluacion_id, tipo, contenido)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [evaluacion_id, tipoRecomendacion, JSON.stringify(recomendacionContenido)]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [evaluacion.empresa_id, req.usuario.id, 'CREATE', 'recomendaciones', 
       JSON.stringify({ evaluacion_id, tipo: tipoRecomendacion })]
    );

    res.status(201).json({
      success: true,
      message: 'Recomendación generada exitosamente',
      data: {
        id: result.rows[0].id,
        evaluacion_id,
        tipo: tipoRecomendacion,
        contenido: recomendacionContenido,
        created_at: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Error al generar recomendación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar recomendación'
    });
  }
};

// Sistema de respaldo con reglas predefinidas para CBI
const generarRecomendacionLocal = (evaluacion) => {
  const { nivel_bp, nivel_bl, nivel_bc, nivel_riesgo, puntaje_bp, puntaje_bl, puntaje_bc } = evaluacion;
  
  const recomendaciones = {
    analisis_general: `El colaborador presenta un nivel de riesgo ${nivel_riesgo}. ` +
      `Burnout Personal: ${nivel_bp}, Burnout Laboral: ${nivel_bl}, Burnout por Cliente: ${nivel_bc}.`,
    
    nivel_urgencia: nivel_riesgo === 'Alto' ? 'ALTA' : (nivel_riesgo === 'Medio' ? 'MEDIA' : 'BAJA'),
    
    dimensiones: {
      burnout_personal: {
        interpretacion: nivel_bp === 'Alto' 
          ? 'Presenta signos significativos de agotamiento físico y emocional general.'
          : nivel_bp === 'Medio'
          ? 'Muestra niveles moderados de fatiga personal que requieren atención.'
          : 'Los niveles de energía personal se encuentran en rangos saludables.',
        senales_alerta: nivel_bp === 'Alto' 
          ? ['Fatiga constante', 'Problemas de sueño', 'Irritabilidad frecuente']
          : ['Cansancio ocasional', 'Necesidad de descansos más frecuentes']
      },
      burnout_laboral: {
        interpretacion: nivel_bl === 'Alto'
          ? 'Se observa un agotamiento significativo relacionado con el trabajo.'
          : nivel_bl === 'Medio'
          ? 'Existen indicios de desgaste laboral que deben monitorearse.'
          : 'Mantiene una relación saludable con su trabajo.',
        senales_alerta: nivel_bl === 'Alto'
          ? ['Desmotivación laboral', 'Dificultad para concentrarse', 'Sensación de sobrecarga']
          : ['Estrés ocasional', 'Necesidad de organizar mejor las tareas']
      },
      burnout_cliente: {
        interpretacion: nivel_bc === 'Alto'
          ? 'Experimenta un desgaste significativo en el trato con clientes/usuarios.'
          : nivel_bc === 'Medio'
          ? 'El trato con clientes/usuarios genera cierto nivel de agotamiento.'
          : 'Mantiene una relación equilibrada con clientes/usuarios.',
        senales_alerta: nivel_bc === 'Alto'
          ? ['Impaciencia con clientes', 'Deseo de evitar interacciones', 'Actitudes negativas']
          : ['Ocasional frustración', 'Necesidad de pausas entre atenciones']
      }
    },
    
    recomendaciones_inmediatas: nivel_riesgo === 'Alto' ? [
      { accion: 'Derivar a evaluación psicológica profesional', responsable: 'Profesional de salud', plazo: '48 horas' },
      { accion: 'Revisar y ajustar carga de trabajo actual', responsable: 'Jefe directo', plazo: '1 semana' },
      { accion: 'Establecer reunión de seguimiento', responsable: 'Recursos Humanos', plazo: '3 días' }
    ] : [
      { accion: 'Programar reunión de retroalimentación', responsable: 'Jefe directo', plazo: '1 semana' },
      { accion: 'Evaluar distribución de tareas', responsable: 'Coordinador de área', plazo: '2 semanas' }
    ],
    
    recomendaciones_mediano_plazo: [
      { accion: 'Implementar programa de bienestar laboral', responsable: 'Recursos Humanos', plazo: '1 mes' },
      { accion: 'Capacitación en manejo del estrés', responsable: 'Área de capacitación', plazo: '2 meses' },
      { accion: 'Revisión de clima organizacional del área', responsable: 'Coordinador institucional', plazo: '3 meses' }
    ],
    
    tecnicas_autocuidado: [
      'Práctica de respiración profunda (5 minutos, 3 veces al día)',
      'Pausas activas cada 2 horas de trabajo',
      'Establecer límites claros entre trabajo y vida personal',
      'Actividad física regular (mínimo 30 minutos diarios)',
      'Técnicas de mindfulness o meditación'
    ],
    
    seguimiento: {
      proxima_evaluacion: nivel_riesgo === 'Alto' ? '2 semanas' : (nivel_riesgo === 'Medio' ? '1 mes' : '3 meses'),
      indicadores_mejora: [
        'Reducción de puntajes en las tres dimensiones',
        'Mayor energía y motivación reportada',
        'Mejora en calidad del sueño',
        'Mejor manejo de situaciones estresantes'
      ],
      indicadores_empeoramiento: [
        'Aumento de ausentismo',
        'Quejas frecuentes de salud física',
        'Conflictos interpersonales',
        'Disminución notable del rendimiento'
      ]
    },
    
    mensaje_personalizado: nivel_riesgo === 'Alto'
      ? 'Entendemos que estás atravesando un momento difícil. Tu bienestar es nuestra prioridad y estamos aquí para apoyarte. No estás solo/a en esto.'
      : nivel_riesgo === 'Medio'
      ? 'Valoramos tu esfuerzo y dedicación. Es importante que cuides de ti mismo/a. Estamos comprometidos en brindarte el apoyo necesario.'
      : 'Tu equilibrio emocional es valioso. Continúa cuidando de tu bienestar y no dudes en buscar apoyo cuando lo necesites.'
  };

  return recomendaciones;
};

// Obtener recomendaciones de una evaluación
const obtenerRecomendaciones = async (req, res) => {
  try {
    const { evaluacion_id } = req.params;

    const result = await query(
      `SELECT * FROM recomendaciones WHERE evaluacion_id = $1 ORDER BY created_at DESC`,
      [evaluacion_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recomendaciones'
    });
  }
};

// Obtener todas las recomendaciones
const obtenerTodasRecomendaciones = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, e.usuario_id, e.nivel_riesgo, u.nombre as usuario_nombre
       FROM recomendaciones r
       JOIN evaluaciones e ON r.evaluacion_id = e.id
       JOIN usuarios u ON e.usuario_id = u.id
       ORDER BY r.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recomendaciones'
    });
  }
};

module.exports = {
  generarRecomendacion,
  obtenerRecomendaciones,
  obtenerTodasRecomendaciones
};