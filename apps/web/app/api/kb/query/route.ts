import { NextRequest, NextResponse } from 'next/server'
import { KnowledgeBaseStore } from '@/lib/kb-store'

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Query the knowledge base
    const result = await KnowledgeBaseStore.query(query, topK)

    // Format response with source information
    const formattedChunks = result.chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      similarity: chunk.similarity,
      source: {
        url: chunk.metadata.sourceUrl,
        title: chunk.metadata.title,
        type: chunk.metadata.sourceType
      },
      tags: chunk.metadata.tags
    }))

    return NextResponse.json({
      query,
      chunks: formattedChunks,
      totalSources: result.sources.size,
      totalChunks: result.totalChunks,
      retrievedChunks: result.chunks.length
    })

  } catch (error) {
    console.error('KB Query API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get KB statistics
    const stats = KnowledgeBaseStore.getStats()
    const sources = KnowledgeBaseStore.getSources()

    return NextResponse.json({
      stats,
      sources: sources.map(source => ({
        id: source.id,
        title: source.title,
        url: source.url,
        type: source.sourceType,
        processedAt: source.processedAt,
        chunkCount: source.chunks.length
      }))
    })

  } catch (error) {
    console.error('KB Stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}