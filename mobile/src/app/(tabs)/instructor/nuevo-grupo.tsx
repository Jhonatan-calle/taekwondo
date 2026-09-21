import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CampoTexto } from "@/components/CampoTexto";
import { useAuthGlobal } from "@/contextos/AuthGlobal";
import { useErrorGlobal } from "@/contextos/ErrorGlobal";
import { MENSAJE_ERROR_GENERICO } from "@/lib/errores";
import {
  esHoraValida,
  esNombreValido,
  horaFinPosterior,
  type HorarioGrupo,
  type Locacion,
} from "@/lib/perfil";

const ABREVIATURAS_DIAS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

type SlotEditable = {
  dia_semana: HorarioGrupo["dia_semana"] | null;
  hora_inicio: string;
  hora_fin: string;
};

type ErroresFormulario = Partial<
  Record<"nombre" | "horarios" | "locacion", string>
>;

const HORA_INICIO_DEFECTO = "18:00";
const HORA_FIN_DEFECTO = "19:30";

function slotValido(slot: SlotEditable): boolean {
  return (
    slot.dia_semana != null &&
    esHoraValida(slot.hora_inicio) &&
    esHoraValida(slot.hora_fin) &&
    horaFinPosterior(slot.hora_inicio, slot.hora_fin)
  );
}

function nuevosSlotsValidos(
  slots: SlotEditable[],
): SlotEditable[] | null {
  const completos = slots.filter(slotValido);
  return completos.length === slots.length && completos.length > 0
    ? completos
    : null;
}

function aHorarioGrupo(slots: SlotEditable[]): HorarioGrupo[] {
  return slots
    .filter((slot) => slot.dia_semana != null)
    .map((slot) => ({
      dia_semana: slot.dia_semana as HorarioGrupo["dia_semana"],
      hora_inicio: slot.hora_inicio.trim(),
      hora_fin: slot.hora_fin.trim(),
    }));
}

function contieneFecha(slot: SlotEditable): boolean {
  return slot.hora_inicio.length > 0 || slot.hora_fin.length > 0;
}

export default function NuevoGrupoScreen() {
  const { listarLocaciones, crearGrupo } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [slots, setSlots] = useState<SlotEditable[]>([
    {
      dia_semana: 1,
      hora_inicio: HORA_INICIO_DEFECTO,
      hora_fin: HORA_FIN_DEFECTO,
    },
  ]);
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
        if (
          actual == null ||
          data.some((locacion) => locacion.id === actual)
        )
          return actual;
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

  const actualizarSlot = (
    indice: number,
    cambios: Partial<SlotEditable>,
  ) => {
    setSlots((actual) =>
      actual.map((slot, i) =>
        i === indice ? { ...slot, ...cambios } : slot,
      ),
    );
  };

  const agregarSlot = () => {
    setSlots((actual) => [
      ...actual,
      { dia_semana: null, hora_inicio: "", hora_fin: "" },
    ]);
  };

  const quitarSlot = (indice: number) => {
    setSlots((actual) =>
      actual.length <= 1
        ? actual
        : actual.filter((_, i) => i !== indice),
    );
  };

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (!esNombreValido(nombre))
      e.nombre = "Ingresá el nombre del grupo.";
    if (nuevosSlotsValidos(slots) == null) {
      e.horarios =
        "Indicá al menos un horario completo (día + hora inicio y fin posterior).";
    }
    if (locacionId == null)
      e.locacion = "Seleccioná una locación o registrá una nueva.";
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
      const resultado = await crearGrupo({
        nombre: nombre.trim(),
        horarios: aHorarioGrupo(slots),
        locacion_id: locacionId,
      });
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO)
          reportarError();
        return;
      }
      router.replace({
        pathname: "/instructor/grupo/[id]",
        params: { id: resultado.nuevoId as string },
      });
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitulo}>
          Creá un grupo de entrenamiento vinculado a una locación y
          definí sus horarios. Después asignás a tus alumnos directos
          como miembros.
        </Text>

        <CampoTexto
          label="Nombre del grupo *"
          autoCapitalize="words"
          placeholder="Ej. Turno nocturno"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Horarios de clase *</Text>
          {slots.map((slot, indice) => {
            const hayFechasSinDia =
              slot.dia_semana == null && contieneFecha(slot);
            return (
              <View key={indice} style={styles.slotHorario}>
                <View style={styles.slotCabecera}>
                  <Text style={styles.slotTitulo}>
                    Día {indice + 1}
                  </Text>
                  {slots.length > 1 ? (
                    <Pressable
                      onPress={() => quitarSlot(indice)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar horario ${indice + 1}`}
                    >
                      <Text style={styles.slotQuitar}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.filaDias}>
                  {([1, 2, 3, 4, 5, 6, 7] as const).map((dia) => {
                    const seleccionado = slot.dia_semana === dia;
                    return (
                      <Pressable
                        key={dia}
                        onPress={() =>
                          actualizarSlot(indice, { dia_semana: dia })
                        }
                        style={[
                          styles.chipDia,
                          seleccionado
                            ? styles.chipDiaSeleccionado
                            : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: seleccionado,
                        }}
                      >
                        <Text
                          style={[
                            styles.chipDiaTexto,
                            seleccionado
                              ? styles.chipDiaTextoSeleccionado
                              : null,
                          ]}
                        >
                          {ABREVIATURAS_DIAS[dia]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {slot.dia_semana == null && !hayFechasSinDia ? (
                  <Text style={styles.ayudaSlot}>
                    Elegí el día de la semana.
                  </Text>
                ) : null}

                <View style={styles.filaHoras}>
                  <View style={styles.columnaHora}>
                    <CampoTexto
                      label="Inicio (HH:mm)"
                      placeholder="18:00"
                      value={slot.hora_inicio}
                      onChangeText={(texto) =>
                        actualizarSlot(indice, { hora_inicio: texto })
                      }
                    />
                  </View>
                  <View style={styles.columnaHora}>
                    <CampoTexto
                      label="Fin (HH:mm)"
                      placeholder="19:30"
                      value={slot.hora_fin}
                      onChangeText={(texto) =>
                        actualizarSlot(indice, { hora_fin: texto })
                      }
                    />
                  </View>
                </View>
                {slot.dia_semana != null && !slotValido(slot) ? (
                  <Text style={styles.ayudaSlot}>
                    Completá horas válidas con el fin posterior al
                    inicio.
                  </Text>
                ) : null}
              </View>
            );
          })}
          <Pressable
            onPress={agregarSlot}
            style={styles.botonAgregar}
            accessibilityRole="button"
          >
            <Text style={styles.botonAgregarTexto}>
              + Agregar horario
            </Text>
          </Pressable>
          {errores.horarios ? (
            <Text style={styles.errorTexto}>{errores.horarios}</Text>
          ) : null}
        </View>

        <View style={styles.bloque}>
          <Text style={styles.label}>Locación *</Text>
          {cargandoLocaciones ? (
            <Text style={styles.avisoLocal}>
              Cargando locaciones…
            </Text>
          ) : null}
          {!cargandoLocaciones && locaciones.length === 0 ? (
            <View style={styles.sinLocaciones}>
              <Text style={styles.avisoLocal}>
                Todavía no registraste locaciones. Creá una para poder
                asociar el grupo.
              </Text>
              <Pressable
                onPress={() =>
                  router.push("/instructor/registrar-locacion")
                }
                style={styles.botonSecundario}
                accessibilityRole="button"
              >
                <Text style={styles.botonSecundarioTexto}>
                  Registrar locación
                </Text>
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
                    style={[
                      styles.chipLocacion,
                      seleccionada ? styles.chipSeleccionada : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionada }}
                  >
                    <Text
                      style={[
                        styles.chipLocacionTexto,
                        seleccionada
                          ? styles.chipTextoSeleccionado
                          : null,
                      ]}
                    >
                      {locacion.nombre}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() =>
                  router.push("/instructor/registrar-locacion")
                }
                style={styles.chipAgregar}
                accessibilityRole="button"
              >
                <Text style={styles.chipAgregarTexto}>+ Nueva</Text>
              </Pressable>
            </View>
          ) : null}
          {errores.locacion ? (
            <Text style={styles.errorTexto}>{errores.locacion}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [
            styles.boton,
            pressed && styles.botonPresionado,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>
            {enviando ? "Creando…" : "Crear grupo"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#fff",
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
    color: "#666",
    marginBottom: 20,
  },
  bloque: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  slotHorario: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  slotCabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  slotTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  slotQuitar: {
    fontSize: 13,
    color: "#C62828",
    fontWeight: "600",
  },
  filaDias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  chipDia: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipDiaSeleccionado: {
    backgroundColor: "#C62828",
    borderColor: "#C62828",
  },
  chipDiaTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  chipDiaTextoSeleccionado: {
    color: "#fff",
  },
  ayudaSlot: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
  },
  filaHoras: {
    flexDirection: "row",
    gap: 12,
  },
  columnaHora: {
    flex: 1,
  },
  botonAgregar: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#C62828",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  botonAgregarTexto: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "600",
  },
  avisoLocal: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  sinLocaciones: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  filaLocaciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipLocacion: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLocacionTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  chipSeleccionada: {
    backgroundColor: "#C62828",
    borderColor: "#C62828",
  },
  chipTextoSeleccionado: {
    color: "#fff",
  },
  chipAgregar: {
    borderWidth: 1,
    borderColor: "#C62828",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAgregarTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C62828",
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: "#C62828",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  botonSecundarioTexto: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "600",
  },
  errorTexto: {
    color: "#C62828",
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    color: "#C62828",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  boton: {
    backgroundColor: "#C62828",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botonPresionado: {
    backgroundColor: "#a02020",
  },
  botonTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
