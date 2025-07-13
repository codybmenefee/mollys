import { NextRequest, NextResponse } from 'next/server'
import { EnhancedKBStore } from '@/lib/enhanced-kb-store'

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 3 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Query the enhanced knowledge base (includes video transcripts)
    const result = await EnhancedKBStore.query(query, topK)

    // Get source attributions for better citations
    const sourceAttributions = await EnhancedKBStore.getSourceAttributions(result.chunks)

    // Format response with enhanced chunk information
    const formattedChunks = result.chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      similarity: chunk.similarity,
      relevanceScore: chunk.relevanceScore,
      sourceType: chunk.sourceType,
      videoId: chunk.videoId,
      channelTitle: chunk.channelTitle,
      publishDate: chunk.publishDate,
      metadata: {
        sourceUrl: chunk.metadata.sourceUrl,
        title: chunk.metadata.title,
        sourceType: chunk.metadata.sourceType,
        timestamp: chunk.metadata.timestamp,
        tags: chunk.metadata.tags
      }
    }))

    return NextResponse.json({
      query,
      chunks: formattedChunks,
      sourceAttributions,
      totalSources: result.sources.size,
      totalChunks: result.totalChunks,
      retrievedChunks: result.chunks.length
    })

  } catch (error) {
    console.error('Enhanced KB Query API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 