import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  aIsoLocal,
  esFechaValida,
  esMontoValido,
  esPeriodoValido,
  mesActual,
  type ArchivoAdjunto,
} from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'periodo' | 'monto' | 'fecha', string>>;

const MIME_PDF = 'application/pdf';

export default function RegistrarPagoAlquilerScreen() {
  const { id, valor_alquiler } = useLocalSearchParams<{ id: string; valor_alquiler?: string }>();
  const { registrarPagoAlquiler } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [periodo, setPeriodo] = useState(mesActual());
  const [monto, setMonto] = useState(valor_alquiler ?? '');
  const [fechaPago, setFechaPago] = useState(aIsoLocal(new Date()));
  const [archivo, setArchivo] = useState<ArchivoAdjunto | null>(null);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const adjuntarDesdeCamara = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para adjuntar la foto del comprobante.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArchivo({
      uri: asset.uri,
      nombre: asset.fileName ?? `comprobante-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const adjuntarDesdeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar el comprobante.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArchivo({
      uri: asset.uri,
      nombre: asset.fileName ?? `comprobante-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const adjuntarPdf = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: MIME_PDF,
      copyToCacheDirectory: true,
    });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArchivo({
      uri: asset.uri,
      nombre: asset.name ?? `comprobante-${Date.now()}.pdf`,
      mimeType: asset.mimeType ?? MIME_PDF,
    });
  };

  const alEnviar = async () => {
    if (enviando || id == null) return;
    const e: ErroresFormulario = {};
    if (!esPeriodoValido(periodo)) e.periodo = 'Ingresá el periodo con formato AAAA-MM (ej. 2026-09).';
    if (!esMontoValido(monto)) e.monto = 'Ingresá el monto pagado (mayor a 0).';
    if (!esFechaValida(fechaPago)) e.fecha = 'Ingresá una fecha de pago válida (no futura).';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await registrarPagoAlquiler({
        locacion_id: id,
        monto: Number(monto.trim().replace(',', '.')),
        periodo: periodo.trim(),
        fecha_pago: fechaPago,
        archivo,
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
          Registrá el pago del alquiler del periodo. El comprobante queda en un bucket privado: solo vos y
          tu superior jerárquico (auditoría) pueden verlo.
        </Text>

        <CampoTexto
          label="Periodo *"
          placeholder="2026-09"
          value={periodo}
          onChangeText={setPeriodo}
          error={errores.periodo}
        />
        <CampoTexto
          label="Monto pagado *"
          keyboardType="numeric"
          placeholder="Ej. 50000"
          value={monto}
          onChangeText={setMonto}
          error={errores.monto}
        />
        <CampoTexto
          label="Fecha de pago *"
          placeholder="AAAA-MM-DD"
          value={fechaPago}
          onChangeText={setFechaPago}
          error={errores.fecha}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Comprobante</Text>
          {archivo == null ? (
            <Text style={styles.ayuda}>Opcional. Sacá una foto, elegí de la galería o adjuntá un PDF.</Text>
          ) : (
            <View style={styles.adjunto}>
              {archivo.mimeType !== MIME_PDF ? (
                <Image source={{ uri: archivo.uri }} style={styles.previa} />
              ) : null}
              <Text style={styles.adjuntoNombre} numberOfLines={1}>
                {archivo.nombre}
              </Text>
              <Pressable onPress={() => setArchivo(null)} accessibilityRole="button">
                <Text style={styles.quitarAdjunto}>Quitar</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.filaBotonesAdjunto}>
            <Pressable onPress={() => void adjuntarDesdeCamara()} style={styles.botonAdjunto} accessibilityRole="button">
              <Text style={styles.botonAdjuntoTexto}>Cámara</Text>
            </Pressable>
            <Pressable onPress={() => void adjuntarDesdeGaleria()} style={styles.botonAdjunto} accessibilityRole="button">
              <Text style={styles.botonAdjuntoTexto}>Galería</Text>
            </Pressable>
            <Pressable onPress={() => void adjuntarPdf()} style={styles.botonAdjunto} accessibilityRole="button">
              <Text style={styles.botonAdjuntoTexto}>PDF</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void alEnviar()}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Registrar pago'}</Text>
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
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ayuda: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  adjunto: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  previa: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
  },
  adjuntoNombre: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  quitarAdjunto: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  filaBotonesAdjunto: {
    flexDirection: 'row',
    gap: 8,
  },
  botonAdjunto: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
  },
  botonAdjuntoTexto: {
    color: '#C62828',
    fontSize: 13,
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
