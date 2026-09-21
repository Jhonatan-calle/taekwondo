import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { Grupo } from '@/lib/perfil';

function FilaGrupo({ grupo, onPresionar }: { grupo: Grupo; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{grupo.nombre}</Text>
        <Text style={styles.datos}>
          {grupo.nombre_locacion ?? 'Sin locación'}
          {grupo.horarios ? ` · ${grupo.horarios}` : ''}
        </Text>
      </View>
      <View style={styles.filaDerecha}>
        <Text style={styles.miembros}>{grupo.cantidad_miembros}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function GruposScreen() {
  const { listarGrupos } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: errorConsulta } = await listarGrupos();
    if (errorConsulta != null || data == null) {
      setError(true);
      if (errorConsulta === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setGrupos(data);
      setError(false);
    }
    setCargando(false);
  }, [listarGrupos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const irANuevo = () => router.push('/instructor/nuevo-grupo');

  const renderItem: ListRenderItem<Grupo> = ({ item }) => (
    <FilaGrupo
      grupo={item}
      onPresionar={() => router.push({ pathname: '/instructor/grupo/[id]', params: { id: item.id } })}
    />
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando grupos…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar tus grupos.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (grupos.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Todavía no tenés grupos de entrenamiento.</Text>
        <Pressable onPress={irANuevo} style={styles.boton} accessibilityRole="button">
          <Text style={styles.botonTexto}>Crear un grupo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FlatList
        data={grupos}
        keyExtractor={(grupo) => grupo.id}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
      />
      <View style={styles.pie}>
        <Pressable onPress={irANuevo} style={styles.boton} accessibilityRole="button">
          <Text style={styles.botonTexto}>Nuevo grupo</Text>
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
  centro: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  lista: {
    padding: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  filaPresionada: {
    backgroundColor: '#f7e9e9',
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
  filaDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miembros: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
    marginRight: 8,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '600',
    color: '#C62828',
    marginLeft: 8,
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
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reintentar: {
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
});