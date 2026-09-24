import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CampoFecha } from '@/components/CampoFecha';
import { CampoPeriodo } from '@/components/CampoPeriodo';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { aIsoLocal, esFechaValida, esMontoValido, esPeriodoValido, mesActual } from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'periodo' | 'monto' | 'fecha', string>>;

export default function RegistrarCuotaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { registrarCuota } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [periodo, setPeriodo] = useState(mesActual());
  const [monto, setMonto] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async () => {
    if (enviando || id == null) return;
    const e: ErroresFormulario = {};
    if (!esPeriodoValido(periodo)) e.periodo = 'Ingresá el periodo con formato AAAA-MM (ej. 2026-09).';
    if (!esMontoValido(monto)) e.monto = 'Ingresá el monto percibido (mayor a 0).';
    if (!esFechaValida(aIsoLocal(fechaSeleccionada))) e.fecha = 'Ingresá una fecha de pago válida (no futura).';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await registrarCuota({
        alumno_id: id,
        periodo: periodo.trim(),
        monto: Number(monto.trim().replace(',', '.')),
        fecha: aIsoLocal(fechaSeleccionada),
      });
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      router.back();
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
          Registrá el pago mensual del alumno. Un alumno no puede tener dos pagos del mismo periodo.
        </Text>

        <CampoPeriodo
          label="Periodo *"
          value={periodo}
          onChange={setPeriodo}
          error={errores.periodo}
        />
        <CampoTexto
          label="Monto percibido *"
          keyboardType="numeric"
          placeholder="Ej. 8000"
          value={monto}
          onChangeText={setMonto}
          error={errores.monto}
        />
        <CampoFecha
          label="Fecha de pago *"
          value={fechaSeleccionada}
          onChange={setFechaSeleccionada}
          maximo={new Date()}
          error={errores.fecha}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void alEnviar()}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Registrar cuota'}</Text>
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
