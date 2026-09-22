import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  esElegibleDobleGraduacion,
  etiquetaResultadoExamen,
  resumirEvaluacion,
  type EstadoMesa,
  type EstadoPostulacion,
  type FilaPlanillaExamen,
  type MesaExamen,
  type ResultadoExamen,
} from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

const ETIQUETA_ESTADO_MESA: Record<EstadoMesa, string> = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  finalizada: 'Finalizada',
};

const ETIQUETA_ACCION: Record<ResultadoExamen, string> = {
  aprobado: 'Aprobado',
  desaprobado: 'Desaprobado',
  ausente: 'Ausente',
};

function FilaAlumno({
  fila,
  puedeEvaluar,
  registrando,
  onRegistrar,
}: {
  fila: FilaPlanillaExamen;
  puedeEvaluar: boolean;
  registrando: boolean;
  onRegistrar: (
    resultado: ResultadoExamen,
    mencionEspecial: boolean,
    promocionDoble?: boolean,
  ) => void;
}) {
  const [mencion, setMencion] = useState(false);
  const pendiente = fila.estado === 'postulado';
  const elegibleDoble = esElegibleDobleGraduacion(fila.grado_actual);
  const peso = fila.peso != null ? `${fila.peso} kg` : 'Sin dato';
  const deshabilitado = !puedeEvaluar || registrando;

  return (
    <View style={styles.fila}>
      <View style={styles.filaHeader}>
        <Text style={styles.nombre}>{fila.nombre_completo}</Text>
        <View style={[styles.badge, badgeResultado(fila.estado)]}>
          <Text style={styles.badgeTexto}>{etiquetaResultadoExamen(fila)}</Text>
        </View>
      </View>
      <Text style={styles.datos}>
        Edad: {fila.edad ?? 'Sin dato'} · Peso: {peso}
      </Text>

      {pendiente ? (
        <Text style={styles.grados}>
          {etiquetaGrado(fila.grado_actual)} → {etiquetaGrado(fila.grado_aspirado)}
        </Text>
      ) : (
        <Text style={styles.grados}>
          Grado otorgado: {etiquetaGrado(fila.grado_aspirado)}
        </Text>
      )}

      {pendiente ? (
        <>
          <Pressable
            onPress={() => setMencion((actual) => !actual)}
            disabled={deshabilitado}
            style={styles.mencion}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mencion, disabled: deshabilitado }}
            accessibilityLabel={`Mención especial para ${fila.nombre_completo}`}
          >
            <Text style={styles.mencionCheck}>{mencion ? '☑' : '☐'}</Text>
            <Text style={styles.mencionTexto}>Mención especial</Text>
          </Pressable>

          <View style={styles.acciones}>
            <Pressable
              onPress={() => onRegistrar('aprobado', mencion)}
              disabled={deshabilitado}
              style={[styles.botonResultado, styles.botonAprobado, deshabilitado ? styles.botonDeshabilitado : null]}
              accessibilityRole="button"
              accessibilityLabel={`Aprobar a ${fila.nombre_completo}`}
            >
              <Text style={[styles.botonResultadoTexto, styles.botonClaroTexto]}>Aprobado</Text>
            </Pressable>

            {elegibleDoble ? (
              <Pressable
                onPress={() => onRegistrar('aprobado', mencion, true)}
                disabled={deshabilitado}
                style={[styles.botonResultado, styles.botonDoble, deshabilitado ? styles.botonDeshabilitado : null]}
                accessibilityRole="button"
                accessibilityLabel={`Doble graduación para ${fila.nombre_completo}`}
              >
                <Text style={[styles.botonResultadoTexto, styles.botonClaroTexto]}>
                  Doble graduación
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => onRegistrar('desaprobado', false)}
              disabled={deshabilitado}
              style={[styles.botonResultado, styles.botonRechazo, deshabilitado ? styles.botonDeshabilitado : null]}
              accessibilityRole="button"
              accessibilityLabel={`Desaprobar a ${fila.nombre_completo}`}
            >
              <Text style={styles.botonResultadoTexto}>Desaprobado</Text>
            </Pressable>

            <Pressable
              onPress={() => onRegistrar('ausente', false)}
              disabled={deshabilitado}
              style={[styles.botonResultado, styles.botonAusente, deshabilitado ? styles.botonDeshabilitado : null]}
              accessibilityRole="button"
              accessibilityLabel={`Marcar ausente a ${fila.nombre_completo}`}
            >
              <Text style={styles.botonResultadoTexto}>Ausente</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

function badgeResultado(estado: EstadoPostulacion) {
  if (estado === 'aprobado') return styles.badgeAprobado;
  if (estado === 'desaprobado') return styles.badgeDesaprobado;
  if (estado === 'ausente') return styles.badgeAusente;
  return styles.badgePendiente;
}

export default function PlanillaEvaluacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listarMesasExamen, obtenerPlanillaMesa, registrarResultadoExamen, sesion } =
    useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [mesa, setMesa] = useState<MesaExamen | null>(null);
  const [filas, setFilas] = useState<FilaPlanillaExamen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const [resultadoMesas, resultadoPlanilla] = await Promise.all([
      listarMesasExamen(),
      obtenerPlanillaMesa(id),
    ]);
    const encontrada = resultadoMesas.data?.find((item) => item.id === id) ?? null;
    if (resultadoMesas.error != null || encontrada == null || resultadoPlanilla.error != null) {
      if (resultadoMesas.error === MENSAJE_ERROR_GENERICO) reportarError();
      if (resultadoPlanilla.error === MENSAJE_ERROR_GENERICO) reportarError();
      setError(true);
    } else {
      setMesa(encontrada);
      setFilas(resultadoPlanilla.data ?? []);
      setError(false);
    }
    setCargando(false);
  }, [id, listarMesasExamen, obtenerPlanillaMesa, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const esPropia = mesa != null && mesa.maestro_id === sesion?.user?.id;
  const puedeEvaluar = esPropia && mesa != null && mesa.estado !== 'abierta';
  const resumen = resumirEvaluacion(filas);

  const registrar = async (
    fila: FilaPlanillaExamen,
    resultado: ResultadoExamen,
    mencionEspecial: boolean,
    promocionDoble: boolean,
  ) => {
    if (registrando) return;
    setRegistrando(true);
    try {
      const respuesta = await registrarResultadoExamen(
        fila.postulacion_id,
        resultado,
        mencionEspecial,
        promocionDoble,
      );
      if (respuesta.error != null) {
        if (respuesta.error === MENSAJE_ERROR_GENERICO) reportarError();
        Alert.alert('No pudimos registrar', 'Intentá de nuevo en unos minutos.');
        return;
      }
      await cargar();
    } catch {
      reportarError();
    } finally {
      setRegistrando(false);
    }
  };

  const confirmarRegistro = (
    fila: FilaPlanillaExamen,
    resultado: ResultadoExamen,
    mencionEspecial: boolean,
    promocionDoble: boolean,
  ) => {
    let titulo: string;
    let mensaje: string;

    if (resultado === 'aprobado' && promocionDoble) {
      titulo = 'Confirmar doble graduación';
      mensaje = `Se registrará a ${fila.nombre_completo} como Doble graduación y ascenderá dos niveles. Esta acción no se puede deshacer.`;
    } else if (resultado === 'aprobado') {
      titulo = 'Confirmar aprobación';
      mensaje = `Se registrará a ${fila.nombre_completo} como Aprobado y ascenderá a ${etiquetaGrado(
        fila.grado_aspirado,
      )}. Esta acción no se puede deshacer.`;
    } else {
      titulo = `Confirmar ${ETIQUETA_ACCION[resultado].toLowerCase()}`;
      mensaje = `Se registrará a ${fila.nombre_completo} como ${ETIQUETA_ACCION[resultado]}. Esta acción no se puede deshacer.`;
    }

    if (mencionEspecial) {
      mensaje = `${mensaje}\n\nMención especial: sí.`;
    }

    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => void registrar(fila, resultado, mencionEspecial, promocionDoble),
      },
    ]);
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando planilla…</Text>
      </View>
    );
  }

  if (error || mesa == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la planilla.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.fecha}>{formatearFecha(mesa.fecha)}</Text>
        <View style={[styles.badge, styles.badgeMesa]}>
          <Text style={styles.badgeTexto}>{ETIQUETA_ESTADO_MESA[mesa.estado]}</Text>
        </View>
      </View>
      <Text style={styles.lugar}>{mesa.lugar ?? 'Sin lugar definido'}</Text>
      <Text style={styles.resumen}>
        Planilla técnica · Evaluados {resumen.evaluados} de {resumen.total}
        {resumen.pendientes > 0 ? ` · Pendientes ${resumen.pendientes}` : ''}
      </Text>

      {!esPropia ? (
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaContenido}>
            Solo el maestro examinador dueño de la mesa puede consultar la planilla y cargar
            resultados.
          </Text>
        </View>
      ) : (
        <>
          {!puedeEvaluar ? (
            <View style={styles.avisoCaja}>
              <Text style={styles.avisoTexto}>
                Cerrá la mesa para poder evaluar. Mientras esté abierta, los profesores siguen
                postulando alumnos.
              </Text>
            </View>
          ) : null}

          {filas.length === 0 ? (
            <View style={styles.centro}>
              <Text style={styles.aviso}>Todavía no hay postulaciones en esta mesa.</Text>
            </View>
          ) : (
            filas.map((fila) => (
              <FilaAlumno
                key={fila.postulacion_id}
                fila={fila}
                puedeEvaluar={puedeEvaluar}
                registrando={registrando}
                onRegistrar={(resultado, mencion, doble) =>
                  confirmarRegistro(fila, resultado, mencion, doble ?? false)
                }
              />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contenido: {
    padding: 20,
    paddingBottom: 48,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fecha: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  lugar: {
    fontSize: 15,
    color: '#333',
    marginTop: 4,
  },
  resumen: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    marginBottom: 16,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMesa: {
    backgroundColor: '#f5f5f5',
    borderColor: '#bbb',
  },
  badgePendiente: {
    backgroundColor: '#f5f5f5',
    borderColor: '#bbb',
  },
  badgeAprobado: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2E7D32',
  },
  badgeDesaprobado: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  badgeAusente: {
    backgroundColor: '#fafafa',
    borderColor: '#bbb',
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  avisoCaja: {
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0c36d',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  avisoTexto: {
    fontSize: 13,
    color: '#7a5900',
    lineHeight: 19,
  },
  tarjeta: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tarjetaContenido: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },
  fila: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  filaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nombre: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginRight: 8,
  },
  datos: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  grados: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
    fontWeight: '600',
  },
  mencion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  mencionCheck: {
    fontSize: 18,
    color: '#C62828',
    marginRight: 8,
  },
  mencionTexto: {
    fontSize: 14,
    color: '#333',
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  botonResultado: {
    flexGrow: 1,
    flexBasis: '45%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    backgroundColor: '#fff',
  },
  botonAprobado: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  botonDoble: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  botonRechazo: {
    borderColor: '#C62828',
  },
  botonAusente: {
    borderColor: '#777',
  },
  botonResultadoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C62828',
  },
  botonClaroTexto: {
    color: '#fff',
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  reintentar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
  },
  reintentarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
});
