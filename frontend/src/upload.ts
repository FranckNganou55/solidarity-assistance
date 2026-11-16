import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { api, getRequestLanguage } from './api';
import { translate } from './i18n';

/**
 * Selectionne une image et l'envoie au serveur.
 * Retourne l'URL publique enregistree, ou null si l'utilisateur annule.
 */
export async function pickAndUpload(kind: 'image' | 'logo' = 'image'): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        try {
          const res = await api.uploadForm((() => {
            const form = new FormData();
            form.append('file', file);
            return form;
          })(), kind);
          resolve(res.logoUrl ?? res.url ?? null);
        } catch (e) { reject(e); }
      };
      input.click();
    });
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(translate(getRequestLanguage(), 'photo_permission_denied'));
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  } as any);
  const res = await api.uploadForm(form, kind);
  return res.logoUrl ?? res.url ?? null;
}

/** Sélectionne une pièce justificative (PDF, document ou image) et l'envoie au serveur. */
export async function pickAndUploadDocument(): Promise<string | null> {
  const accepted = 'application/pdf,image/png,image/jpeg,image/webp,.doc,.docx';
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accepted;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        try {
          const form = new FormData();
          form.append('file', file);
          const response = await api.uploadForm(form, 'document');
          resolve(response.url ?? null);
        } catch (error) { reject(error); }
      };
      input.click();
    });
  }

  const selection = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (selection.canceled || !selection.assets[0]) return null;
  const asset = selection.assets[0];
  const form = new FormData();
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as any);
  const response = await api.uploadForm(form, 'document');
  return response.url ?? null;
}
