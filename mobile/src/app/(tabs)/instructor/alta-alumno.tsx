import { useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { GRADOS, etiquetaGrado, type Grado } from '@/constants/grados';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  aIsoLocal,
  calcularEdad,
  esAlturaValida,
  esDniValido,
  esPesoValido,
  esTelefonoValido,
  fechaValidaNacimiento,
  MENSAJE_DNI_DUPLICADO,
  parsearNumero,
  type DatosAltaAlumno,
  type Genero,
} from '@/lib/perfil';

const OPCIONES_GENERO: { valor: Genero; etiqueta: string }[] = [
  { valor: 'masculino', etiqueta: 'Masculino' },
  { valor: 'femenino', etiqueta: 'Femenino' },
  { valor: 'otro', etiqueta: 'Otro' },
];

type ErroresFormulario = Partial<
  Record<'nombre' | 'dni' | 'fechaNacimiento' | 'peso' | 'genero' | 'grado' | 'altura' | 'telefono', string>
>;

function formatearFecha(fecha: Date): string {
  const [anio, mes, dia] = aIsoLocal(fecha).split('-');
  return `${dia}/${mes}/${anio}`;
}

export default function AltaAlumnoScreen() {
  const { altaAlumno, verificarDniDisponible } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [datosSalud, setDatosSalud] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [grado, setGrado] = useState<Grado>('blanco');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const edadCalculada = useMemo(
    () => calcularEdad(fechaSeleccionada != null ? aIsoLocal(fechaSeleccionada) : null),
    [fechaSeleccionada],
  );

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (nombre.trim() === '') e.nombre = 'Ingresá el nombre completo del alumno.';
    if (!esDniValido(dni)) e.dni = 'El DNI debe tener 7 u 8 dígitos.';
    if (fechaSeleccionada == null) {
      e.fechaNacimiento = 'Seleccioná la fecha de nacimiento.';
    } else if (!fechaValidaNacimiento(aIsoLocal(fechaSeleccionada))) {
      e.fechaNacimiento = 'La fecha debe ser válida (edad mínima de 4 años).';
    }
    if (!esPesoValido(peso)) e.peso = 'Ingresá el peso en kg (mayor a 0).';
    if (genero == null) e.genero = 'Seleccioná el género.';
    if (!esAlturaValida(altura)) e.altura = 'Altura inválida (de 50 a 230 cm).';
    if (!esTelefonoValido(telefono)) e.telefono = 'Teléfono inválido.';
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
      const datos: DatosAltaAlumno = {
        nombre_completo: nombre.trim(),
        dni: dni.trim(),
        fecha_nacimiento: aIsoLocal(fechaSeleccionada as Date),
        peso_kg: parsearNumero(peso) ?? 0,
        genero: genero as Genero,
        grado_actual: grado,
        altura_cm: altura.trim() === '' ? null : parsearNumero(altura),
        telefono: telefono.trim() === '' ? null : telefono.trim(),
        contacto_emergencia: contactoEmergencia.trim() === '' ? null : contactoEmergencia.trim(),
        datos_salud: datosSalud.trim() === '' ? null : datosSalud.trim(),
      };
      const resultado = await altaAlumno(datos);
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      router.replace('/instructor/alumnos');
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
          Los campos marcados con * son obligatorios. El alumno queda asignado a tu cuenta como alumno directo.
        </Text>

        <CampoTexto
          label="Nombre completo *"
          autoCapitalize="words"
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
          {edadCalculada != null ? <Text style={styles.edad}>Edad calculada: {edadCalculada} años</Text> : null}
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
                  style={[styles.opcionGenero, seleccionado ? styles.opcionSeleccionada : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionado }}
                >
                  <Text style={[styles.opcionTexto, seleccionado ? styles.opcionTextoSeleccionado : null]}>
                    {opcion.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errores.genero ? <Text style={styles.errorTexto}>{errores.genero}</Text> : null}
        </View>

        <View style={styles.bloque}>
          <Text style={styles.label}>Grado actual *</Text>
          <View style={styles.filaGrado}>
            {GRADOS.map((opcion) => {
              const seleccionado = grado === opcion;
              return (
                <Pressable
                  key={opcion}
                  onPress={() => setGrado(opcion)}
                  style={[styles.chipGrado, seleccionado ? styles.opcionSeleccionada : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionado }}
                >
                  <Text style={[styles.chipGradoTexto, seleccionado ? styles.opcionTextoSeleccionado : null]}>
                    {etiquetaGrado(opcion)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errores.grado ? <Text style={styles.errorTexto}>{errores.grado}</Text> : null}
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
          label="Teléfono / Celular (opcional)"
          keyboardType="phone-pad"
          placeholder="Ej. 1155551234"
          value={telefono}
          onChangeText={setTelefono}
          error={errores.telefono}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Guardar alumno'}</Text>
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
  filaGrado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipGrado: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipGradoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  opcionSeleccionada: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  opcionTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  opcionTextoSeleccionado: {
    color: '#fff',
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