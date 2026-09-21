import 'react-native-get-random-values'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { ModeOfOperation, Counter, utils } from 'aes-js'

const CLAVE_PREFIX = 'supabase.segura.'
const DATOS_PREFIX = 'supabase.auth.'

export class LargeSecureStore {
  async getItem(key: string): Promise<string | null> {
    const claveId = CLAVE_PREFIX + key
    const claveHex = await SecureStore.getItemAsync(claveId)
    if (claveHex == null) return null
    const datos = await AsyncStorage.getItem(DATOS_PREFIX + key)
    if (datos == null) return null
    const descifrado = this.descifrar(
      utils.hex.toBytes(claveHex),
      utils.hex.toBytes(datos),
    )
    return utils.utf8.fromBytes(descifrado)
  }

  async setItem(key: string, value: string): Promise<void> {
    const claveId = CLAVE_PREFIX + key
    const clave = crypto.getRandomValues(new Uint8Array(32))
    await SecureStore.setItemAsync(claveId, utils.hex.fromBytes(clave))
    const cifrado = this.cifrar(clave, utils.utf8.toBytes(value))
    await AsyncStorage.setItem(DATOS_PREFIX + key, utils.hex.fromBytes(cifrado))
  }

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(CLAVE_PREFIX + key)
    await AsyncStorage.removeItem(DATOS_PREFIX + key)
  }

  private cifrar(clave: Uint8Array, datos: Uint8Array): Uint8Array {
    const aes = new ModeOfOperation.ctr(clave, new Counter(5))
    return aes.encrypt(datos)
  }

  private descifrar(clave: Uint8Array, datos: Uint8Array): Uint8Array {
    const aes = new ModeOfOperation.ctr(clave, new Counter(5))
    return aes.decrypt(datos)
  }
}