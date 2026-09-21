import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { etiquetaGrado } from '@/constants/grados';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  aIsoLocal,
  calcularEdad,
  esAlturaValida,
  esDniValido,
  esPesoValido,
  fechaValidaNacimiento,
  MENSAJE_DNI_DUPLICADO,
  parsearNumero,
  type DatosPerfilACompletar,
  type Genero,
  type InstructorLinaje,
} from '@/lib/perfil';

const OPCIONES_GENERO: { valor: Genero; etiqueta: string }[] = [
  { valor: 'masculino', etiqueta: 'Masculino' },
  { valor: 'femenino', etiqueta: 'Femenino' },
  { valor: 'otro', etiqueta: 'Otro' },
];

type ErroresFormulario = Partial<
  Record<'nombre' | 'dni' | 'fechaNacimiento' | 'peso' | 'genero' | 'altura' | 'instructor', string>
>;

function formatearFecha(fecha: Date): string {
  const [anio, mes, dia] = aIsoLocal(fecha).split('-');
  return `${dia}/${mes}/${anio}`;
}

export default function OnboardingScreen() {
  const { perfil, onboardingCompleto, completarPerfil, listarInstructores, solicitarLinaje, verificarDniDisponible } =
    useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const esMaestroUsuario = perfil?.es_maestro === true;
  const tieneLinajeEstablecido = perfil?.maestro_id != null;
  const necesitaLinaje = !esMaestroUsuario && !tieneLinajeEstablecido;

  useEffect(() => {
    if (onboardingCompleto) router.replace('/');
  }, [onboardingCompleto, router]);

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [datosSalud, setDatosSalud] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [instructores, setInstructores] = useState<InstructorLinaje[]>([]);
  const [cargandoInstructores, setCargandoInstructores] = useState(false);
  const [errorInstructores, setErrorInstructores] = useState(false);
  const [instructorSeleccionado, setInstructorSeleccionado] = useState<string | null>(null);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const prefillHecho = useRef(false);

  const edadCalculada = useMemo(
    () => calcularEdad(fechaSeleccionada != null ? aIsoLocal(fechaSeleccionada) : null),
    [fechaSeleccionada],
  );

  useEffect(() => {
    if (perfil == null || prefillHecho.current) return;
    prefillHecho.current = true;
    setNombre(perfil.nombre_completo);
    setDni(perfil.dni ?? '');
    setPeso(perfil.peso_kg != null ? String(perfil.peso_kg) : '');
    setAltura(perfil.altura_cm != null ? String(perfil.altura_cm) : '');
    setContactoEmergencia(perfil.contacto_emergencia ?? '');
    setDatosSalud(perfil.datos_salud ?? '');
    setGenero(perfil.genero);
    if (perfil.fecha_nacimiento != null) {
      const [anio, mes, dia] = perfil.fecha_nacimiento.split('-').map(Number);
      setFechaSeleccionada(new Date(anio, mes - 1, dia));
    }
  }, [perfil]);

  const cargarInstructores = useCallback(async () => {
    setCargandoInstructores(true);
    setErrorInstructores(false);
    const { data, error } = await listarInstructores();
    if (error != null || data == null) {
      setErrorInstructores(true);
    } else {
      setInstructores(data);
    }
    setCargandoInstructores(false);
  }, [listarInstructores]);

  useEffect(() => {
    if (necesitaLinaje) void cargarInstructores();
  }, [necesitaLinaje, cargarInstructores]);

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (nombre.trim() === '') e.nombre = 'Ingresá tu nombre completo.';
    if (!esDniValido(dni)) e.dni = 'El DNI debe tener 7 u 8 dígitos.';
    if (fechaSeleccionada == null) {
      e.fechaNacimiento = 'Seleccioná tu fecha de nacimiento.';
    } else if (!fechaValidaNacimiento(aIsoLocal(fechaSeleccionada))) {
      e.fechaNacimiento = 'La fecha debe ser válida (edad mínima de 4 años).';
    }
    if (!esPesoValido(peso)) e.peso = 'Ingresá tu peso en kg (mayor a 0).';
    if (genero == null) e.genero = 'Seleccioná tu género.';
    if (!esAlturaValida(altura)) e.altura = 'Altura inválida (de 50 a 230 cm).';
    if (necesitaLinaje) {
      if (cargandoInstructores) {
        e.instructor = 'La lista de instructores se está cargando…';
      } else if (errorInstructores) {
        e.instructor = 'No pudimos cargar la lista de instructores.';
      } else if (instructores.length === 0) {
        e.instructor = 'Aún no hay instructores registrados. Avisá a la administración.';
      } else if (instructorSeleccionado == null) {
        e.instructor = 'Seleccioná tu instructor.';
      }
    }
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
      const disponible = await verificarDniDisponible(dni.trim());
      if (disponible === false) {
        setErrores((prev) => ({ ...prev, dni: MENSAJE_DNI_DUPLICADO }));
        return;
      }
      const datos: DatosPerfilACompletar = {
        nombre_completo: nombre.trim(),
        dni: dni.trim(),
        fecha_nacimiento: aIsoLocal(fechaSeleccionada as Date),
        peso_kg: parsearNumero(peso) ?? 0,
        genero: genero as Genero,
        altura_cm: altura.trim() === '' ? null : parsearNumero(altura),
        contacto_emergencia: contactoEmergencia.trim() === '' ? null : contactoEmergencia.trim(),
        datos_salud: datosSalud.trim() === '' ? null : datosSalud.trim(),
      };
      const resultado = await completarPerfil(datos);
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      if (necesitaLinaje && instructorSeleccionado != null) {
        const resultadoLinaje = await solicitarLinaje(instructorSeleccionado);
        if (resultadoLinaje.error) {
          setError(resultadoLinaje.error);
          if (resultadoLinaje.error === MENSAJE_ERROR_GENERICO) reportarError();
          return;
        }
      }
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
        <Text style={styles.titulo}>Completá tu perfil</Text>
        <Text style={styles.subtitulo}>
          Estos datos nos permiten armar tu ficha para la escuela. Los campos marcados son obligatorios.
        </Text>

        <CampoTexto
          label="Nombre completo *"
          autoCapitalize="words"
          textContentType="name"
          placeholder="Nombre y apellido"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
        />
        <CampoTexto
          label="DNI *"
          keyboardType="number-pad"
          placeholder="Sin puntos (ej. 30123456)"
          maxLength={8}
          value={dni}
          onChangeText={setDni}
          error={errores.dni}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Fecha de nacimiento *</Text>
          <Pressable
            onPress={() => setMostrarSelectorFecha(true)}
            style={[styles.entradaPresionable, errores.fechaNacimiento ? styles.entradaPresionableError : null]}
            accessibilityRole="button"
          >
            <Text style={fechaSeleccionada == null ? styles.placeholder : styles.valorFecha}>
              {fechaSeleccionada != null ? formatearFecha(fechaSeleccionada) : 'Seleccionar fecha'}
            </Text>
          </Pressable>
          {edadCalculada != null ? (
            <Text style={styles.edad}>Edad calculada: {edadCalculada} años</Text>
          ) : null}
          {errores.fechaNacimiento ? <Text style={styles.errorTexto}>{errores.fechaNacimiento}</Text> : null}
          {mostrarSelectorFecha ? (
            <DateTimePicker
              value={fechaSeleccionada ?? new Date(2000, 0, 1)}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onValueChange={(_evento, seleccionada) => {
                setMostrarSelectorFecha(false);
                setFechaSeleccionada(seleccionada);
              }}
              onDismiss={() => setMostrarSelectorFecha(false)}
            />
          ) : null}
        </View>

        <CampoTexto
          label="Peso (kg) *"
          keyboardType="decimal-pad"
          placeholder="Ej. 65.5"
          value={peso}
          onChangeText={setPeso}
          error={errores.peso}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Género *</Text>
          <View style={styles.filaGenero}>
            {OPCIONES_GENERO.map((opcion) => {
              const seleccionado = genero === opcion.valor;
              return (
                <Pressable
                  key={opcion.valor}
                  onPress={() => setGenero(opcion.valor)}
                  style={[styles.opcionGenero, seleccionado ? styles.opcionGeneroSeleccionada : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionado }}
                >
                  <Text style={[styles.opcionGeneroTexto, seleccionado ? styles.opcionGeneroTextoSeleccionado : null]}>
                    {opcion.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errores.genero ? <Text style={styles.errorTexto}>{errores.genero}</Text> : null}
        </View>

        <CampoTexto
          label="Altura (cm) (opcional)"
          keyboardType="decimal-pad"
          placeholder="Ej. 175"
          value={altura}
          onChangeText={setAltura}
          error={errores.altura}
        />
        <CampoTexto
          label="Contacto de emergencia (opcional)"
          placeholder="Nombre y teléfono"
          value={contactoEmergencia}
          onChangeText={setContactoEmergencia}
        />
        <CampoTexto
          label="Datos de salud (opcional)"
          placeholder="Alergias, lesiones, etc."
          value={datosSalud}
          onChangeText={setDatosSalud}
        />

        {necesitaLinaje ? (
          <View style={styles.bloque}>
            <Text style={styles.label}>Tu instructor / maestro *</Text>
            <Text style={styles.edad}>
              Lo elegís ahora; tu instructor deberá confirmar tu registro desde su cuenta.
            </Text>
            {cargandoInstructores ? (
              <Text style={styles.edad}>Cargando instructores…</Text>
            ) : errorInstructores ? (
              <View>
                <Text style={styles.errorTexto}>No pudimos cargar la lista de instructores.</Text>
                <Pressable
                  onPress={() => void cargarInstructores()}
                  style={styles.reintentar}
                  accessibilityRole="button"
                >
                  <Text style={styles.reintentarTexto}>Reintentar</Text>
                </Pressable>
              </View>
            ) : instructores.length === 0 ? (
              <Text style={styles.errorTexto}>Aún no hay instructores registrados. Avisá a la administración.</Text>
            ) : (
              <View style={styles.listaInstructores}>
                {instructores.map((inst) => {
                  const seleccionado = instructorSeleccionado === inst.id;
                  return (
                    <Pressable
                      key={inst.id}
                      onPress={() => setInstructorSeleccionado(inst.id)}
                      style={[styles.opcionInstructor, seleccionado ? styles.opcionInstructorSeleccionada : null]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: seleccionado }}
                    >
                      <Text style={[styles.nombreInstructor, seleccionado ? styles.nombreInstructorSeleccionado : null]}>
                        {inst.nombre_completo}
                      </Text>
                      <Text style={[styles.dataInstructor, seleccionado ? styles.dataInstructorSeleccionado : null]}>
                        {inst.es_maestro ? 'Maestro' : 'Profesor'} · {etiquetaGrado(inst.grado_actual)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {errores.instructor ? <Text style={styles.errorTexto}>{errores.instructor}</Text> : null}
          </View>
        ) : esMaestroUsuario ? (
          <View style={styles.bloque}>
            <Text style={styles.label}>Linaje</Text>
            <Text style={styles.edad}>Te registraste como Maestro: tu linaje se define a nivel de administración.</Text>
          </View>
        ) : (
          <View style={styles.bloque}>
            <Text style={styles.label}>Linaje</Text>
            <Text style={styles.edad}>Tu instructor ya fue asignado y no puede modificarse.</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Guardar perfil'}</Text>
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
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
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
  entradaPresionable: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  entradaPresionableError: {
    borderColor: '#C62828',
  },
  valorFecha: {
    fontSize: 16,
    color: '#111',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
  edad: {
    color: '#666',
    fontSize: 13,
    marginTop: 6,
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
  filaGenero: {
    flexDirection: 'row',
    gap: 8,
  },
  opcionGenero: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  opcionGeneroSeleccionada: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  opcionGeneroTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  opcionGeneroTextoSeleccionado: {
    color: '#fff',
  },
  listaInstructores: {
    gap: 8,
  },
  opcionInstructor: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  opcionInstructorSeleccionada: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  nombreInstructor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  nombreInstructorSeleccionado: {
    color: '#fff',
  },
  dataInstructor: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dataInstructorSeleccionado: {
    color: '#f5d8d8',
  },
  reintentar: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
  },
  reintentarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
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