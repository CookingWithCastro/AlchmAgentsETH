import { NextRequest, NextResponse } from 'next/server'

declare global {
  var temporalGrimoireCache:
    | Map<
        string,
        {
          data: Buffer
          format: string
          filename: string
          timestamp: number
        }
      >
    | undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const filename = searchParams.get('filename')

    if (!id) {
      return NextResponse.json({ error: 'Download ID is required' }, { status: 400 })
    }

    // Check if cache exists and has the file
    if (!global.temporalGrimoireCache || !global.temporalGrimoireCache.has(id)) {
      return NextResponse.json(
        { error: 'Download not found or expired. Please generate a new export.' },
        { status: 404 }
      )
    }

    const cacheEntry = global.temporalGrimoireCache.get(id)!

    // Check if the entry has expired (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    if (cacheEntry.timestamp < fiveMinutesAgo) {
      global.temporalGrimoireCache.delete(id)
      return NextResponse.json(
        { error: 'Download expired. Please generate a new export.' },
        { status: 404 }
      )
    }

    // Determine content type based on format
    let contentType = 'application/octet-stream'
    switch (cacheEntry.format) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'html':
        contentType = 'text/html'
        break
      case 'markdown':
      case 'md':
        contentType = 'text/markdown'
        break
      case 'epub':
        contentType = 'application/epub+zip'
        break
    }

    // Return the file
    return new NextResponse(new Uint8Array(cacheEntry.data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename || cacheEntry.filename}"`,
        'Content-Length': cacheEntry.data.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving grimoire download:', error)
    return NextResponse.json({ error: 'Failed to serve download' }, { status: 500 })
  }
}
