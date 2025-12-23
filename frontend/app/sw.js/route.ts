// app/sw.js/route.ts
// Ruta API para servir el Service Worker
// Next.js requiere que los Service Workers se sirvan desde rutas API con el tipo MIME correcto

import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Leer el archivo del Service Worker desde public
    const swPath = join(process.cwd(), 'public', 'sw.js')
    const swContent = await readFile(swPath, 'utf-8')
    
    // Devolver con el tipo MIME correcto para Service Workers
    return new NextResponse(swContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error sirviendo Service Worker:', error)
    return new NextResponse('Service Worker no encontrado', { status: 404 })
  }
}

