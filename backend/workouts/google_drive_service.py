"""
Servicio para interactuar con Google Drive API
Permite listar videos de una carpeta y crear ejercicios automáticamente
"""
import os
import re
from typing import List, Dict, Optional
from django.conf import settings


def extract_exercise_name_from_filename(filename: str) -> str:
    """
    Extrae el nombre del ejercicio del nombre del archivo
    Ejemplo: "curl-de-biceps.mp4" -> "Curl de Biceps"
    """
    # Eliminar extensión
    name = re.sub(r'\.(mp4|mov|avi|mkv|webm|flv|wmv)$', '', filename, flags=re.IGNORECASE)
    
    # Reemplazar guiones y guiones bajos con espacios
    name = re.sub(r'[-_]', ' ', name)
    
    # Normalizar espacios múltiples
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Capitalizar palabras
    words = name.split()
    name = ' '.join(word.capitalize() for word in words)
    
    return name


def normalize_exercise_name(name: str) -> str:
    """
    Normaliza el nombre del ejercicio
    - Elimina extensiones de archivo
    - Limpia espacios y caracteres especiales
    - Capitaliza palabras
    """
    # Eliminar extensiones de video comunes
    name = re.sub(r'\.(mp4|mov|avi|mkv|webm|flv|wmv)$', '', name, flags=re.IGNORECASE)
    
    # Limpiar espacios y caracteres especiales
    name = name.strip()
    
    # Capitalizar palabras
    words = name.split()
    name = ' '.join(word.capitalize() for word in words)
    
    return name


class GoogleDriveService:
    """Servicio para interactuar con Google Drive API"""
    
    def __init__(self):
        self.credentials_path = getattr(settings, 'GOOGLE_DRIVE_CREDENTIALS_PATH', None)
        self.api_key = getattr(settings, 'GOOGLE_DRIVE_API_KEY', None)
        self.folder_id = getattr(settings, 'GOOGLE_DRIVE_FOLDER_ID', '1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG')
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Inicializa el servicio de Google Drive"""
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
        except ImportError:
            raise ImportError(
                'google-api-python-client y google-auth no están instalados. '
                'Instálalos con: pip install google-api-python-client google-auth'
            )
        
        try:
            # Opción 1: Service Account (recomendado para backend)
            if self.credentials_path and os.path.exists(self.credentials_path):
                credentials = service_account.Credentials.from_service_account_file(
                    self.credentials_path,
                    scopes=['https://www.googleapis.com/auth/drive.readonly']
                )
                self.service = build('drive', 'v3', credentials=credentials)
                return
            
            # Opción 2: API Key (menos seguro pero más simple)
            if self.api_key:
                self.service = build('drive', 'v3', developerKey=self.api_key)
                return
            
            # No hay credenciales configuradas
            self.service = None
            
        except Exception as e:
            raise Exception(f'Error al inicializar Google Drive API: {e}')
    
    def is_configured(self) -> bool:
        """Verifica si el servicio está configurado correctamente"""
        return self.service is not None
    
    def list_videos_from_folder(self, folder_id: Optional[str] = None) -> List[Dict]:
        """
        Lista todos los videos de una carpeta de Google Drive
        
        Args:
            folder_id: ID de la carpeta (opcional, usa el configurado por defecto)
        
        Returns:
            Lista de diccionarios con información de los videos:
            [
                {
                    'name': 'Nombre del ejercicio',
                    'file_id': 'ID del archivo',
                    'filename': 'nombre_archivo.mp4'
                },
                ...
            ]
        """
        if not self.is_configured():
            raise Exception(
                'Google Drive API no está configurada. '
                'Configura GOOGLE_DRIVE_CREDENTIALS_PATH o GOOGLE_DRIVE_API_KEY en settings.'
            )
        
        folder_id = folder_id or self.folder_id
        videos = []
        
        try:
            from googleapiclient.errors import HttpError
            
            page_token = None
            while True:
                # Listar archivos de la carpeta que sean videos
                query = f"'{folder_id}' in parents and mimeType contains 'video' and trashed=false"
                
                results = self.service.files().list(
                    q=query,
                    fields="nextPageToken, files(id, name, mimeType, size, modifiedTime)",
                    pageToken=page_token,
                    pageSize=100,
                    orderBy='name'
                ).execute()
                
                items = results.get('files', [])
                
                for item in items:
                    exercise_name = extract_exercise_name_from_filename(item['name'])
                    videos.append({
                        'name': exercise_name,
                        'file_id': item['id'],
                        'filename': item['name'],
                        'mime_type': item.get('mimeType', ''),
                        'size': item.get('size', '0'),
                        'modified_time': item.get('modifiedTime', '')
                    })
                
                page_token = results.get('nextPageToken')
                if not page_token:
                    break
                    
        except HttpError as e:
            raise Exception(f'Error al listar archivos de Google Drive: {e}')
        except Exception as e:
            raise Exception(f'Error inesperado al acceder a Google Drive: {e}')
        
        return videos
    
    def get_file_info(self, file_id: str) -> Optional[Dict]:
        """
        Obtiene información de un archivo específico de Google Drive
        
        Args:
            file_id: ID del archivo
        
        Returns:
            Diccionario con información del archivo o None si no existe
        """
        if not self.is_configured():
            raise Exception('Google Drive API no está configurada.')
        
        try:
            from googleapiclient.errors import HttpError
            
            file_info = self.service.files().get(
                fileId=file_id,
                fields='id, name, mimeType, size, modifiedTime, webViewLink, webContentLink'
            ).execute()
            
            return {
                'id': file_info.get('id'),
                'name': file_info.get('name'),
                'mime_type': file_info.get('mimeType'),
                'size': file_info.get('size'),
                'modified_time': file_info.get('modifiedTime'),
                'web_view_link': file_info.get('webViewLink'),
                'web_content_link': file_info.get('webContentLink')
            }
        except HttpError as e:
            if e.resp.status == 404:
                return None
            raise Exception(f'Error al obtener información del archivo: {e}')
        except Exception as e:
            raise Exception(f'Error inesperado: {e}')


# Instancia global del servicio (singleton)
_google_drive_service = None


def get_google_drive_service() -> GoogleDriveService:
    """Obtiene la instancia global del servicio de Google Drive"""
    global _google_drive_service
    if _google_drive_service is None:
        _google_drive_service = GoogleDriveService()
    return _google_drive_service

