import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { esHorarioValido, esNombreValido, type Locacion } from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'nombre' | 'horarios' | 'locacion', string>>;

export default function NuevoGrupoScreen() {
  const { listarLocaciones, crearGrupo } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [horarios, setHorarios] = useState('');
  const [locacionId, setLocacionId] = useState<string | null>(null);
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [cargandoLocaciones, setCargandoLocaciones] = useState(true);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarLocaciones = useCallback(async () => {
    setCargandoLocaciones(true);
    const { data, error: errorConsulta } = await listarLocaciones();
    if (errorConsulta != null || data == null) {
      if (errorConsulta === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocaciones(data);
      setLocacionId((actual) => {
        if (actual == null || data.some((locacion) => locacion.id === actual)) return actual;
        return data.length > 0 ? data[0].id : null;
      });
    }
    setCargandoLocaciones(false);
  }, [listarLocaciones, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargarLocaciones();
    }, [cargarLocaciones]),
  );

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (!esNombreValido(nombre)) e.nombre = 'Ingresá el nombre del grupo.';
    if (!esHorarioValido(horarios)) e.horarios = 'Indicá los horarios de clase (ej. Lun y Mié 18:00-19:30).';
    if (locacionId == null) e.locacion = 'Seleccioná una locación o registrá una nueva.';
    return e;
  };

  const alEnviar = async () => {
    if (enviando) return;
    const e = validar();
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await crearGrupo({ nombre: nombre.trim(), horarios: horarios.trim(), locacion_id: locacionId });
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      router.replace({ pathname: '/instructor/grupo/[id]', params: { id: resultado.nuevoId as string } });
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitulo}>
          Creá un grupo de entrenamiento vinculado a una locación. Después asignás a tus alumnos directos como
          miembros.
        </Text>

        <CampoTexto
          label="Nombre del grupo *"
          autoCapitalize="words"
          placeholder="Ej. Turno nocturno"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
        />
        <CampoTexto
          label="Horarios de clase *"
          placeholder="Ej. Lun y Mié 18:00-19:30"
          value={horarios}
          onChangeText={setHorarios}
          error={errores.horarios}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Locación *</Text>
          {cargandoLocaciones ? <Text style={styles.avisoLocal}>Cargando locaciones…</Text> : null}
          {!cargandoLocaciones && locaciones.length === 0 ? (
            <View style={styles.sinLocaciones}>
              <Text style={styles.avisoLocal}>
                Todavía no registraste locaciones. Creá una para poder asociar el grupo.
              </Text>
              <Pressable
                onPress={() => router.push('/instructor/registrar-locacion')}
                style={styles.botonSecundario}
                accessibilityRole="button"
              >
                <Text style={styles.botonSecundarioTexto}>Registrar locación</Text>
              </Pressable>
            </View>
          ) : null}
          {!cargandoLocaciones && locaciones.length > 0 ? (
            <View style={styles.filaLocaciones}>
              {locaciones.map((locacion) => {
                const seleccionada = locacionId === locacion.id;
                return (
                  <Pressable
                    key={locacion.id}
                    onPress={() => setLocacionId(locacion.id)}
                    style={[styles.chipLocacion, seleccionada ? styles.chipSeleccionada : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionada }}
                  >
                    <Text style={[styles.chipLocacionTexto, seleccionada ? styles.chipTextoSeleccionado : null]}>
                      {locacion.nombre}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => router.push('/instructor/registrar-locacion')}
                style={styles.chipAgregar}
                accessibilityRole="button"
              >
                <Text style={styles.chipAgregarTexto}>+ Nueva</Text>
              </Pressable>
            </View>
          ) : null}
          {errores.locacion ? <Text style={styles.errorTexto}>{errores.locacion}</Text> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Creando…' : 'Crear grupo'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pantalla: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  bloque: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  avisoLocal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  sinLocaciones: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  filaLocaciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipLocacion: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLocacionTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chipSeleccionada: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  chipTextoSeleccionado: {
    color: '#fff',
  },
  chipAgregar: {
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAgregarTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C62828',
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  botonSecundarioTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  boton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botonPresionado: {
    backgroundColor: '#a02020',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});