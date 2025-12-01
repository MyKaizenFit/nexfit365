#!/usr/bin/env python3
"""
Script para actualizar los ejercicios con los IDs de video de Google Drive
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import Exercise

# Mapeo de nombre de archivo a file ID de Google Drive
VIDEO_FILE_IDS = {
    "ABDUCCIÓN en POLEA.MOV": "1R3hL42zvqID-QB5e0Jgu1HsxwZhi73FP",
    "BUENOS DÍAS en MULTIPOWER.MOV": "1hVF7X1pLkD2V1AlH5UIPj8ARO3KKMWCN",
    "CLAMSHELLS.MOV": "18cwIrcAFTCja-a1Rfo2yrDVCaS4orTVU",
    "CRUNCH ABDOMINAL en POLEA ALTA.MOV": "1Ek73nCGDcZDKHPa33_x6GDxf_ngbkxZj",
    "CURL de BÍCEPS BAYESIAN.MOV": "1df8_tZybglSp-2lfJNH_BgA9kVgbXEVo",
    "CURL de BÍCEPS en POLEA con BARRA Z.MOV": "1g8xvzPVSm9IixCdFQYb_TFjBgQzyg1L0",
    "CURL de BÍCEPS en POLEA UNILATERAL.MOV": "1XvW_pI13L9qXxZA-Oqol8MV9vJiVDmia",
    "CURL FEMORAL en MÁQUINA.MOV": "1t2_FKRhQWQrUZu8L8fLxZ3tqsT5dSdnV",
    "DOMINADA con BANDA ELÁSTICA.MOV": "1aDeXRUlSl4TYRKqpdBm7XHZiql3nX-Vc",
    "DOMINADA PRONA.MOV": "1leoAPT-gfW5-vi6p7aw2-Et1BqCroOfV",
    "ELEVACIÓN de TALÓN en MULTIPOWER.MOV": "1JFxE8ibrgPfbxhkIl-un3ELf1RRT2UKn",
    "EXTENSIÓN de CUÁDRICEPS en MÁQUINA.MOV": "10GXnSdDVO0D9p4Ije1izVmThw4JfRZot",
    "EXTENSIÓN DE TRÍCEPS EN POLEA ALTA CON BARRA Z.MOV": "1qbXJ1yL4KD-FKzAEYYpDmGFVlXKmDmkx",
    "EXTENSIÓN de TRÍCEPS en POLEA ALTA.MOV": "1mpn1dvmuYFSJEDOeugARxDEjN0M90rXz",
    "HIP THRUST en MULTIPOWER GLUTE BUILDER.MOV": "1cBiE2c13UET7KD_ssUps9LrPwitrvYYu",
    "HIPEREXTENSIONES con LASTRE.MOV": "1gfpkYJ9hIqEwjPvYN6TWTgW-hUpyKC2n",
    "HIPEREXTENSIONES en MÁQUINA GLUTE BUILDER.MOV": "1Dofr5JZSJYat914o04Jfv5O9PFWwCjV_",
    "HIPEREXTENSIONES.MOV": "1K-ESh2ruKGpOXtGigF3RW57I3fwJdcc6",
    "JALÓN al PECHO AGARRE ESTRECHO.MOV": "1hYimM9UWXVCQ66FI8shr5agccY1CjEOs",
    "JALÓN al PECHO AGARRE PRONO.MOV": "1390hWUbCEeSoG-y4Xjaok3nIngc00ZRB",
    "JALÓN al PECHO AGARRE SUPINO.MOV": "1vC-VnM9JX-351UI78kg17s7JZQ1qJLI2",
    "JALÓN al PECHO AGARRE UNILATERAL.MOV": "1jgAzBDSjksfn632YDJCL3ijqLxA5X6Yx",
    "JALÓN al PECHO EN MÁQUINA.MOV": "1d6-IC09jrlVTwIQ4WeiH6heEV6784Dy2",
    "PATADA de GLÚTEO en MÁQUINA.MOV": "1-AYHcfjCJSxaq644Oo9ePYYJliBaxZWq",
    "PATADA de GLÚTEO en POLEA MEDIA.MOV": "1f_yehcj7XhWj0cxmHhkLIYD-9TNFsZ3T",
    "PESO MUERTO PIERNAS RÍGIDAS en MULTIPOWER.MOV": "1_v0-0ENP_YgUV-_W_we-lTWuHQegOCcj",
    "PESO MUERTO RUMANO en MULTIPOWER.MOV": "1BUmizHMeimmNKt2dc5b44VLAu42MBSut",
    "PESO MUERTO SUMO en MULTIPOWER.MOV": "1JpwBpgqqeDz_WJoGj7RfTXA1y-Myb_fd",
    "PESO MUERTO UNILATERAL en MULTIPOWER.MOV": "1Q2APoIQhamjj4vrRsyE6Htc8nE7-SbRX",
    "PRENSA con PIES ARRIBA.MOV": "10J96DFcJaQEDscZhbYPqA12ybVjBmj-r",
    "PRENSA de GLÚTEO en MULTIPOWER.MOV": "1yGNzbx99MszJJadW2IhB6p-zq9_eouof",
    "PRENSA UNILATERAL.MOV": "1V9LvVQArCpRoAMhGRiqWfClDiDSkSGGf",
    "PRENSA.MOV": "1o5xKHhc2wibk2BPkEXk7uLfdwGg3US0B",
    "PRES BANCA AGARRE ABIERTO en MULTIPOWER.MOV": "1B2cph_0pQrZwlzAbIiOY2e_-UFoMwmO_",
    "PRES BANCA AGARRE ESTRECHO en MULTIPOWER.MOV": "1y1WwWK7wIZ2jXCJZc6PMp04KPAZZfRef",
    "PRES BANCA en MULTIPOWER.MOV": "1LYoonI3aFzkNLAXABjo-NgPXhG7LunM8",
    "PRES BANCA INCLINADO en MULTIPOWER.MOV": "1SHCmxhda5jJbb07Hsp9EtaLvtB7AVixM",
    "PRES MILITAR en MULTIPOWER.MOV": "1M441uMTiTv7eH4lPmF2BnvfLftTEFVrl",
    "PUENTE de GLÚTEO con PESO.MOV": "1mdgfrUsPg64hs1MjrGcA2kY438qdlacG",
    "PUENTE DE GLÚTEO.MOV": "1If8M8Q7b8Aibav1NXdiOzLQzCT-NyvDI",
    "PULL OVER en MÁQUINA.MOV": "1ooGIJSLDqluoHgC7Cfd3imxlO_nlRSF9",
    "PULL OVER en POLEA ALTA.MOV": "1_N_nT-t-z3kXgVpBfDx_2jcFpBJKJxkQ",
    "REMO AGARRE NEUTRO en POLEA BAJA.MOV": "1JbcgChHQxwLLnT3xBMDumM3hsexU-Ch_",
    "REMO AGARRE PRONO ABIERTO en POLEA BAJA.MOV": "1HVebrts9hnax1TjPFK8o7xo0-Nzg8pu7",
    "REMO ALTO UNILATERAL en MÁQUINA.MOV": "1od0QI-e8x0Kqt0rTz0ciK0HPvpAGkjJI",
    "REMO con BARRA.MOV": "1k-mSCHfazJakXePDQKaxKqhSAnC35IDs",
    "REMO con MANCUERNA UNILATERAL.mov": "1Td82CwpykTu_OKkxPJ2fTA65cjNQN1ra",
}

def get_streaming_url(file_id):
    """Genera URL de streaming de Google Drive"""
    return f"https://drive.google.com/file/d/{file_id}/preview"

def get_download_url(file_id):
    """Genera URL de descarga directa de Google Drive"""
    return f"https://drive.google.com/uc?export=download&id={file_id}"

def main():
    print("=" * 80)
    print("📹 ACTUALIZANDO VIDEOS DE EJERCICIOS CON IDs DE GOOGLE DRIVE")
    print("=" * 80)
    print()
    
    updated = 0
    not_found = 0
    
    for exercise in Exercise.objects.all():
        # Extraer nombre de archivo del video_url actual (gdrive://filename)
        if exercise.video_url and exercise.video_url.startswith("gdrive://"):
            filename = exercise.video_url.replace("gdrive://", "")
            
            if filename in VIDEO_FILE_IDS:
                file_id = VIDEO_FILE_IDS[filename]
                
                # Actualizar el ejercicio
                exercise.google_drive_file_id = file_id
                exercise.video_url = get_streaming_url(file_id)
                exercise.save()
                
                print(f"  ✅ {exercise.name}")
                print(f"     📹 {exercise.video_url}")
                updated += 1
            else:
                # Intentar buscar con variaciones (mayúsculas/minúsculas)
                found = False
                for vid_filename, vid_id in VIDEO_FILE_IDS.items():
                    if vid_filename.upper() == filename.upper():
                        file_id = vid_id
                        exercise.google_drive_file_id = file_id
                        exercise.video_url = get_streaming_url(file_id)
                        exercise.save()
                        
                        print(f"  ✅ {exercise.name} (match aproximado)")
                        print(f"     📹 {exercise.video_url}")
                        updated += 1
                        found = True
                        break
                
                if not found:
                    print(f"  ⚠️ {exercise.name} - Video no encontrado: {filename}")
                    not_found += 1
    
    print()
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"✅ Ejercicios actualizados: {updated}")
    print(f"⚠️  Videos no encontrados: {not_found}")
    print()
    
    # Verificar resultados
    with_video = Exercise.objects.exclude(google_drive_file_id='').exclude(google_drive_file_id__isnull=True).count()
    print(f"📹 Total ejercicios con video: {with_video}")

if __name__ == "__main__":
    main()



