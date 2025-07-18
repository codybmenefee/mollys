export interface KnowledgeChunk {
  id: string
  content: string
  embedding: number[]
  metadata: {
    sourceUrl: string
    title: string
    sourceType: 'youtube' | 'article' | 'document' | 'manual'
    timestamp?: Date
    tags?: string[]
  }
  similarity?: number
}

export interface KnowledgeSource {
  id: string
  url: string
  title: string
  content: string
  sourceType: 'youtube' | 'article' | 'document' | 'manual'
  processedAt: Date
  chunks: KnowledgeChunk[]
}

export interface RetrievalResult {
  chunks: KnowledgeChunk[]
  sources: Set<string>
  totalChunks: number
}

export class KnowledgeBaseStore {
  private static STORAGE_KEY = 'pasturepilot_kb_store'
  private static CHUNK_SIZE = 500 // characters per chunk
  private static CHUNK_OVERLAP = 50 // overlapping characters
  private static MAX_CHUNKS = 1000 // max chunks to store

  /**
   * Ingest content into the knowledge base
   */
  static async ingestContent(source: Omit<KnowledgeSource, 'id' | 'processedAt' | 'chunks'>): Promise<boolean> {
    try {
      const chunks = await this.createChunks(source.content, source)
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks)
      
      const knowledgeSource: KnowledgeSource = {
        id: this.generateId(),
        processedAt: new Date(),
        chunks: chunksWithEmbeddings,
        ...source
      }

      await this.saveSource(knowledgeSource)
      console.log(`Ingested ${chunksWithEmbeddings.length} chunks from ${source.title}`)
      return true
    } catch (error) {
      console.error('Failed to ingest content:', error)
      return false
    }
  }

  /**
   * Query the knowledge base for relevant chunks
   */
  static async query(query: string, topK: number = 5): Promise<RetrievalResult> {
    try {
      const queryEmbedding = await this.generateQueryEmbedding(query)
      const allChunks = await this.getAllChunks()
      
      // Calculate similarity scores
      const chunksWithSimilarity = allChunks.map(chunk => ({
        ...chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }))

      // Sort by similarity and take top K
      const topChunks = chunksWithSimilarity
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, topK)

      const sources = new Set(topChunks.map(chunk => chunk.metadata.sourceUrl))

      return {
        chunks: topChunks,
        sources,
        totalChunks: allChunks.length
      }
    } catch (error) {
      console.error('Failed to query knowledge base:', error)
      return {
        chunks: [],
        sources: new Set(),
        totalChunks: 0
      }
    }
  }

  /**
   * Get all sources in the knowledge base
   */
  static getSources(): KnowledgeSource[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load sources:', error)
      return []
    }
  }

  /**
   * Delete a source from the knowledge base
   */
  static deleteSource(sourceId: string): boolean {
    try {
      const sources = this.getSources()
      const filtered = sources.filter(source => source.id !== sourceId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Failed to delete source:', error)
      return false
    }
  }

  /**
   * Clear all knowledge base content
   */
  static clearAll(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Failed to clear knowledge base:', error)
      return false
    }
  }

  /**
   * Get knowledge base statistics
   */
  static getStats(): { 
    totalSources: number
    totalChunks: number
    sourceTypes: Record<string, number>
    lastUpdated: Date | null
  } {
    const sources = this.getSources()
    const totalChunks = sources.reduce((sum, source) => sum + source.chunks.length, 0)
    const sourceTypes = sources.reduce((acc, source) => {
      acc[source.sourceType] = (acc[source.sourceType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const lastUpdated = sources.length > 0 
      ? new Date(Math.max(...sources.map(s => s.processedAt.getTime())))
      : null

    return {
      totalSources: sources.length,
      totalChunks,
      sourceTypes,
      lastUpdated
    }
  }

  /**
   * Create chunks from content
   */
  private static async createChunks(content: string, source: Omit<KnowledgeSource, 'id' | 'processedAt' | 'chunks'>): Promise<Omit<KnowledgeChunk, 'embedding'>[]> {
    const chunks: Omit<KnowledgeChunk, 'embedding'>[] = []
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    let currentChunk = ''
    let chunkIndex = 0

    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.'
      
      if (currentChunk.length + sentenceWithPunctuation.length > this.CHUNK_SIZE) {
        if (currentChunk.trim()) {
          chunks.push({
            id: `${source.url}-chunk-${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              sourceUrl: source.url,
              title: source.title,
              sourceType: source.sourceType,
              timestamp: new Date(),
              tags: this.extractTags(currentChunk)
            }
          })
          chunkIndex++
        }
        
        // Start new chunk with overlap
        const overlap = currentChunk.slice(-this.CHUNK_OVERLAP)
        currentChunk = overlap + ' ' + sentenceWithPunctuation
      } else {
        currentChunk += ' ' + sentenceWithPunctuation
      }
    }

    // Add remaining content as final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${source.url}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          sourceUrl: source.url,
          title: source.title,
          sourceType: source.sourceType,
          timestamp: new Date(),
          tags: this.extractTags(currentChunk)
        }
      })
    }

    return chunks
  }

  /**
   * Generate embeddings for chunks
   */
  private static async generateEmbeddings(chunks: Omit<KnowledgeChunk, 'embedding'>[]): Promise<KnowledgeChunk[]> {
    const chunksWithEmbeddings: KnowledgeChunk[] = []
    
    for (const chunk of chunks) {
      try {
        const embedding = await this.generateQueryEmbedding(chunk.content)
        chunksWithEmbeddings.push({
          ...chunk,
          embedding
        })
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error)
        // Skip chunks that fail to embed
      }
    }

    return chunksWithEmbeddings
  }

  /**
   * Generate embedding for a query
   */
  private static async generateQueryEmbedding(text: string): Promise<number[]> {
    // Construct absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const embedUrl = `${baseUrl}/api/kb/embed`
    
    const response = await fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error('Failed to generate embedding')
    }

    const data = await response.json()
    return data.embedding
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Extract relevant tags from content
   */
  private static extractTags(content: string): string[] {
    const farmingKeywords = [
      'sheep', 'grazing', 'pasture', 'grass', 'health', 'feeding', 'breeding',
      'vaccination', 'medicine', 'veterinarian', 'weather', 'rotation', 'fencing',
      'water', 'shelter', 'predator', 'parasite', 'nutrition', 'lambing', 'shearing'
    ]
    
    const tags: string[] = []
    const lowerContent = content.toLowerCase()
    
    for (const keyword of farmingKeywords) {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword)
      }
    }
    
    return tags
  }

  /**
   * Get all chunks from all sources
   */
  private static async getAllChunks(): Promise<KnowledgeChunk[]> {
    const sources = this.getSources()
    const allChunks: KnowledgeChunk[] = []
    for (const source of sources) {
      allChunks.push(...source.chunks)
    }
    return allChunks
  }

  /**
   * Save a source to storage
   */
  private static async saveSource(source: KnowledgeSource): Promise<void> {
    const sources = this.getSources()
    const existingIndex = sources.findIndex(s => s.id === source.id)
    
    if (existingIndex >= 0) {
      sources[existingIndex] = source
    } else {
      sources.push(source)
    }

    // Enforce max chunks limit
    const totalChunks = sources.reduce((sum, s) => sum + s.chunks.length, 0)
    if (totalChunks > this.MAX_CHUNKS) {
      // Remove oldest sources until under limit
      sources.sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime())
      let currentChunks = 0
      const filteredSources = []
      
      for (const s of sources) {
        if (currentChunks + s.chunks.length <= this.MAX_CHUNKS) {
          filteredSources.push(s)
          currentChunks += s.chunks.length
        } else {
          break
        }
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSources))
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sources))
    }
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}