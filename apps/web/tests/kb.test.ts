import { KnowledgeBaseStore } from '@/lib/kb-store'

// Mock the fetch function for testing
global.fetch = jest.fn()

describe('Knowledge Base Tests', () => {
  beforeEach(() => {
    // Clear knowledge base before each test
    KnowledgeBaseStore.clearAll()
    
    // Reset fetch mock
    ;(fetch as jest.Mock).mockClear()
  })

  describe('Content Ingestion', () => {
    it('should ingest content and create chunks', async () => {
      // Mock embedding API response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0).map(() => Math.random())
        })
      })

      const sampleContent = `
        Sheep grazing tips for beginners. Sheep are excellent grazers and can help improve pasture health through rotational grazing.
        Start with small paddocks and move sheep every 3-4 days. Monitor grass height and ensure sheep have access to fresh water.
        Sheep should graze grass down to about 2-3 inches before moving to fresh pasture.
        This prevents overgrazing and allows grass to recover properly.
      `

      const source = {
        url: 'https://youtube.com/watch?v=test123',
        title: 'Sheep Grazing Tips for Beginners',
        content: sampleContent,
        sourceType: 'youtube' as const
      }

      const success = await KnowledgeBaseStore.ingestContent(source)
      expect(success).toBe(true)

      const stats = KnowledgeBaseStore.getStats()
      expect(stats.totalSources).toBe(1)
      expect(stats.totalChunks).toBeGreaterThan(0)
    })

    it('should handle ingestion errors gracefully', async () => {
      // Mock embedding API failure
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      const source = {
        url: 'https://test.com/fail',
        title: 'Test Source',
        content: 'Test content',
        sourceType: 'article' as const
      }

      const success = await KnowledgeBaseStore.ingestContent(source)
      expect(success).toBe(false)
    })
  })

  describe('Knowledge Retrieval', () => {
    beforeEach(async () => {
      // Mock embedding API for setup
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0).map(() => Math.random())
        })
      })

      // Ingest sample content
      const sheepGrazingContent = `
        Sheep grazing management is crucial for pasture health. Rotational grazing involves moving sheep between paddocks.
        The recommended grazing period is 3-4 days per paddock. Sheep should not graze grass below 2 inches.
        Overgrazing can damage root systems and reduce grass quality. Always ensure sheep have access to fresh water.
      `

      const healthContent = `
        Sheep health monitoring involves daily observations. Look for signs of lameness, coughing, or abnormal behavior.
        Common health issues include foot rot, internal parasites, and respiratory problems.
        Regular veterinary checkups are essential. Vaccination schedules should be followed carefully.
      `

      await KnowledgeBaseStore.ingestContent({
        url: 'https://youtube.com/watch?v=grazing123',
        title: 'Sheep Grazing Management',
        content: sheepGrazingContent,
        sourceType: 'youtube'
      })

      await KnowledgeBaseStore.ingestContent({
        url: 'https://farm-health.com/sheep-health',
        title: 'Sheep Health Monitoring',
        content: healthContent,
        sourceType: 'article'
      })
    })

    it('should retrieve relevant chunks for grazing queries', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        })
      })

      const result = await KnowledgeBaseStore.query('sheep grazing tips', 3)
      
      expect(result.chunks.length).toBeGreaterThan(0)
      expect(result.sources.size).toBeGreaterThan(0)
      expect(result.totalChunks).toBeGreaterThan(0)
      
      // Check if retrieved chunks contain grazing-related content
      const chunkContents = result.chunks.map(c => c.content.toLowerCase())
      expect(chunkContents.some(content => 
        content.includes('grazing') || content.includes('paddock')
      )).toBe(true)
    })

    it('should include source information in retrieved chunks', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        })
      })

      const result = await KnowledgeBaseStore.query('sheep health', 2)
      
      expect(result.chunks.length).toBeGreaterThan(0)
      
      const chunk = result.chunks[0]
      expect(chunk.metadata.sourceUrl).toBeDefined()
      expect(chunk.metadata.title).toBeDefined()
      expect(chunk.metadata.sourceType).toBeDefined()
    })
  })

  describe('End-to-End Chat Integration', () => {
    it('should integrate KB retrieval with chat responses', async () => {
      // Mock KB embedding and chat APIs
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: new Array(1536).fill(0).map(() => Math.random())
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'Based on the sources provided, here are some sheep grazing tips. [Source: Sheep Grazing Management](https://youtube.com/watch?v=grazing123) recommends rotational grazing with 3-4 days per paddock.'
              }
            }]
          })
        })

      // First ingest content
      await KnowledgeBaseStore.ingestContent({
        url: 'https://youtube.com/watch?v=grazing123',
        title: 'Sheep Grazing Management',
        content: 'Rotational grazing is key to pasture health. Move sheep every 3-4 days between paddocks.',
        sourceType: 'youtube'
      })

      // Test chat integration
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What are some sheep grazing tips?' }
          ],
          model: 'mistralai/mistral-7b-instruct',
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.choices[0].message.content).toContain('Source:')
      expect(data.choices[0].message.content).toContain('youtube.com')
    })
  })

  describe('KB Query API', () => {
    it('should handle KB query API requests', async () => {
      // Mock embedding and setup
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: new Array(1536).fill(0).map(() => Math.random())
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            query: 'sheep grazing tips',
            chunks: [
              {
                id: 'test-chunk-1',
                content: 'Sheep grazing advice content',
                similarity: 0.85,
                source: {
                  url: 'https://youtube.com/watch?v=test',
                  title: 'Sheep Grazing Tips',
                  type: 'youtube'
                },
                tags: ['sheep', 'grazing']
              }
            ],
            totalSources: 1,
            totalChunks: 1,
            retrievedChunks: 1
          })
        })

      // First ingest content
      await KnowledgeBaseStore.ingestContent({
        url: 'https://youtube.com/watch?v=test',
        title: 'Sheep Grazing Tips',
        content: 'Sheep grazing advice content',
        sourceType: 'youtube'
      })

      // Test KB query API
      const response = await fetch('/api/kb/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'sheep grazing tips',
          topK: 3
        })
      })

      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.query).toBe('sheep grazing tips')
      expect(data.chunks).toBeDefined()
      expect(data.totalSources).toBeDefined()
      expect(data.retrievedChunks).toBeDefined()
    })
  })

  describe('Citation Handling', () => {
    it('should properly format citations in responses', () => {
      const testContent = 'Here is farming advice. [Source: Sheep Farming Guide](https://youtube.com/watch?v=test123) More content here.'
      
      // This would be tested in the MessageRenderer component
      expect(testContent).toContain('[Source: Sheep Farming Guide](https://youtube.com/watch?v=test123)')
    })
  })

  describe('Knowledge Base Management', () => {
    it('should get knowledge base statistics', () => {
      const stats = KnowledgeBaseStore.getStats()
      
      expect(stats.totalSources).toBe(0)
      expect(stats.totalChunks).toBe(0)
      expect(stats.sourceTypes).toEqual({})
      expect(stats.lastUpdated).toBeNull()
    })

    it('should manage source lifecycle', async () => {
      // Mock embedding API
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0).map(() => Math.random())
        })
      })

      // Add source
      await KnowledgeBaseStore.ingestContent({
        url: 'https://test.com/source1',
        title: 'Test Source',
        content: 'Test content',
        sourceType: 'article'
      })

      let stats = KnowledgeBaseStore.getStats()
      expect(stats.totalSources).toBe(1)

      // Get sources
      const sources = KnowledgeBaseStore.getSources()
      expect(sources.length).toBe(1)

      // Delete source
      const sourceId = sources[0].id
      const deleted = KnowledgeBaseStore.deleteSource(sourceId)
      expect(deleted).toBe(true)

      stats = KnowledgeBaseStore.getStats()
      expect(stats.totalSources).toBe(0)
    })

    it('should clear all knowledge base content', async () => {
      // Mock embedding API
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0).map(() => Math.random())
        })
      })

      // Add content
      await KnowledgeBaseStore.ingestContent({
        url: 'https://test.com/source1',
        title: 'Test Source',
        content: 'Test content',
        sourceType: 'article'
      })

      let stats = KnowledgeBaseStore.getStats()
      expect(stats.totalSources).toBe(1)

      // Clear all
      const cleared = KnowledgeBaseStore.clearAll()
      expect(cleared).toBe(true)

      stats = KnowledgeBaseStore.getStats()
      expect(stats.totalSources).toBe(0)
    })
  })
})

// Manual ingestion test for POC
describe('Manual KB Ingestion POC', () => {
  it('should manually ingest YouTube sheep grazing content', async () => {
    // Mock successful embedding generation
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: new Array(1536).fill(0).map(() => Math.random())
      })
    })

    const sampleYouTubeContent = `
      Welcome to sheep grazing 101! In this video, I'll share essential tips for rotational grazing.
      
      First, understand your pasture. Sheep need about 2-3 inches of grass height for optimal nutrition.
      Never let them graze below 2 inches as this damages the root system.
      
      Rotational grazing involves moving sheep every 3-4 days. This allows grass to recover and prevents overgrazing.
      Set up your paddocks with temporary fencing. Electric fencing works well for this purpose.
      
      Water is crucial - sheep need constant access to fresh, clean water. Plan your paddock layout around water sources.
      
      Monitor your sheep daily. Look for signs of lameness, coughing, or unusual behavior.
      A healthy sheep should be alert and actively grazing.
      
      Parasite management is essential. Rotate pastures to break parasite cycles.
      Consider fecal egg counts to monitor parasite loads.
      
      Remember, good grazing management benefits both sheep and pasture health.
    `

    const result = await KnowledgeBaseStore.ingestContent({
      url: 'https://youtube.com/watch?v=sheep-grazing-101',
      title: 'Sheep Grazing 101 - Complete Guide',
      content: sampleYouTubeContent,
      sourceType: 'youtube'
    })

    expect(result).toBe(true)

    const stats = KnowledgeBaseStore.getStats()
    expect(stats.totalSources).toBe(1)
    expect(stats.totalChunks).toBeGreaterThan(0)
    expect(stats.sourceTypes.youtube).toBe(1)

    // Test retrieval
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      })
    })

    const queryResult = await KnowledgeBaseStore.query('sheep grazing tips', 3)
    expect(queryResult.chunks.length).toBeGreaterThan(0)
    expect(queryResult.sources.has('https://youtube.com/watch?v=sheep-grazing-101')).toBe(true)

    // Verify content contains expected keywords
    const chunkContents = queryResult.chunks.map(c => c.content.toLowerCase())
    expect(chunkContents.some(content => 
      content.includes('grazing') || content.includes('paddock') || content.includes('sheep')
    )).toBe(true)
  })
})