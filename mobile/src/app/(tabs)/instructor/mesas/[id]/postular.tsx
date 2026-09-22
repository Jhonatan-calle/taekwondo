import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { esMontoValido, type CandidatoPostulacion } from '@/lib/perfil';

function FilaCandidato({
  candidato,
  seleccionado,
  onAlternar,
}: {
  candidato: CandidatoPostulacion;
  seleccionado: boolean;
  onAlternar: () => void;
}) {
  const sinSuperior = candidato.grado_aspirado == null && !candidato.ya_postulado;
  return (
    <Pressable
      onPress={onAlternar}
      disabled={candidato.ya_postulado || sinSuperior}
      style={[
        styles.fila,
        seleccionado ? styles.filaSeleccionada : null,
        candidato.ya_postulado || sinSuperior ? styles.filaDeshabilitada : null,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seleccionado || candidato.ya_postulado }}
    >
      <Text style={styles.check}>{candidato.ya_postulado ? '✓' : seleccionado ? '☑' : '☐'}</Text>
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{candidato.nombre_completo}</Text>
        <Text style={styles.datos}>
          {etiquetaGrado(candidato.grado_actual)}
          {candidato.grado_aspirado != null ? ` → ${etiquetaGrado(candidato.grado_aspirado)}` : ''}
        </Text>
        {candidato.ya_postulado ? (
          <Text style={styles.marca}>Ya postulado en esta mesa</Text>
        ) : sinSuperior ? (
          <Text style={styles.marca}>Ya alcanzó el grado máximo</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PostularScreen() {
  const { id, postulacion_id: postulacionId } = useLocalSearchParams<{
    id: string;
    postulacion_id?: string;
  }>();
  const esSoloCobro = postulacionId != null && postulacionId !== '';

  const { listarCandidatosPostulacion, postularAlumno, editarDerechoExamen } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [candidatos, setCandidatos] = useState<CandidatoPostulacion[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [derecho, setDerecho] = useState('');
  const [errores, setErrores] = useState<{ derecho?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setCargando(false);
      return;
    }
    setCargando(true);
    const resultado = await listarCandidatosPostulacion(id);
    if (resultado.error != null || resultado.data == null) {
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
      setError(MENSAJE_ERROR_GENERICO);
    } else {
      setCandidatos(resultado.data);
      setError(null);
    }
    setCargando(false);
  }, [id, listarCandidatosPostulacion, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const alternar = (alumnoId: string) => {
    setSeleccionados((actual) =>
      actual.includes(alumnoId) ? actual.filter((item) => item !== alumnoId) : [...actual, alumnoId],
    );
  };

  const montoValido = (): number | null => {
    if (derecho.trim() === '') return null;
    if (!esMontoValido(derecho)) return null;
    return Number(derecho.trim().replace(',', '.'));
  };

  const guardar = async () => {
    if (enviando || id == null) return;

    const e: { derecho?: string } = {};
    if (derecho.trim() !== '' && !esMontoValido(derecho)) {
      e.derecho = 'Ingresá un monto válido (mayor a 0) o dejalo vacío.';
    }
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    const monto = montoValido();

    setEnviando(true);
    try {
      if (esSoloCobro && postulacionId != null) {
        const resultado = await editarDerechoExamen(postulacionId, monto ?? 0);
        if (resultado.error != null) {
          setError(resultado.error);
          if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
          return;
        }
        router.back();
        return;
      }

      if (seleccionados.length === 0) {
        setError('Seleccioná al menos un alumno para postular.');
        return;
      }

      let fallaron = 0;
      for (const alumnoId of seleccionados) {
        const resultado = await postularAlumno(id, alumnoId, monto);
        if (resultado.error != null) fallaron += 1;
      }

      if (fallaron > 0) {
        Alert.alert(
          'Postulación parcial',
          `${seleccionados.length - fallaron} alumno(s) postulado(s). ${fallaron} no se pudieron postular.`,
        );
      }
      router.back();
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  const renderItem: ListRenderItem<CandidatoPostulacion> = ({ item }) => (
    <FilaCandidato
      candidato={item}
      seleccionado={seleccionados.includes(item.alumno_id)}
      onAlternar={() => alternar(item.alumno_id)}
    />
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando alumnos…</Text>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>
          {esSoloCobro
            ? 'Actualizá el monto del derecho de examen de esta postulación.'
            : 'Marcá a los alumnos que postulás. El grado aspirado lo calcula el sistema (grado inmediato superior).'}
        </Text>
        <CampoTexto
          label="Derecho de examen (opcional)"
          keyboardType="numeric"
          placeholder="Ej. 5000"
          value={derecho}
          onChangeText={setDerecho}
          error={errores.derecho}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {esSoloCobro ? null : candidatos.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No tenés alumnos directos para postular.</Text>
        </View>
      ) : (
        <FlatList
          data={candidatos}
          keyExtractor={(item) => item.alumno_id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
        />
      )}

      <View style={styles.pie}>
        <Pressable
          onPress={() => void guardar()}
          disabled={enviando}
          style={[styles.boton, enviando ? styles.botonDeshabilitado : null]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>
            {enviando ? 'Guardando…' : esSoloCobro ? 'Guardar cobro' : 'Postular seleccionados'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cabecera: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  error: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
  lista: {
    padding: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  filaSeleccionada: {
    borderColor: '#C62828',
    backgroundColor: '#fdf0f0',
  },
  filaDeshabilitada: {
    opacity: 0.6,
  },
  check: {
    fontSize: 20,
    color: '#C62828',
    marginRight: 12,
  },
  filaContenido: {
    flex: 1,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  datos: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  marca: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 4,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  pie: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  boton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
