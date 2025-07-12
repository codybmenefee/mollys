import { KnowledgeBaseStore } from './kb-store'

/**
 * Manual KB Ingestion POC
 * This demonstrates how to manually ingest content for testing
 */
export class KBIngestionPOC {
  /**
   * Ingest sample sheep grazing content from YouTube
   */
  static async ingestSheepGrazingContent(): Promise<boolean> {
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

    try {
      const result = await KnowledgeBaseStore.ingestContent({
        url: 'https://youtube.com/watch?v=sheep-grazing-101',
        title: 'Sheep Grazing 101 - Complete Guide',
        content: sampleYouTubeContent,
        sourceType: 'youtube'
      })

      console.log('✅ Successfully ingested sheep grazing content')
      return result
    } catch (error) {
      console.error('❌ Failed to ingest sheep grazing content:', error)
      return false
    }
  }

  /**
   * Ingest sample sheep health content
   */
  static async ingestSheepHealthContent(): Promise<boolean> {
    const healthContent = `
      Sheep health monitoring is crucial for maintaining a healthy flock. Here are key indicators to watch for:

      Daily observations should include checking for limping, coughing, or unusual behavior.
      Healthy sheep should be alert, responsive, and actively grazing or ruminating.

      Common health issues include:
      - Foot rot: caused by wet conditions, presents as limping
      - Internal parasites: can cause weight loss and diarrhea
      - Respiratory issues: watch for coughing or nasal discharge
      - Pregnancy toxemia: affects pregnant ewes, requires immediate attention

      Preventive measures:
      - Regular hoof trimming every 6-8 weeks
      - Rotational grazing to break parasite cycles
      - Proper nutrition and mineral supplementation
      - Vaccination schedules as recommended by veterinarian

      Emergency signs requiring immediate veterinary attention:
      - Difficulty breathing
      - Prolonged labor in ewes
      - Severe lameness
      - Unusual discharge from eyes or nose
      - Sudden change in appetite or behavior

      Always consult with a veterinarian for proper diagnosis and treatment plans.
    `

    try {
      const result = await KnowledgeBaseStore.ingestContent({
        url: 'https://farm-health.com/sheep-health-monitoring',
        title: 'Comprehensive Sheep Health Monitoring Guide',
        content: healthContent,
        sourceType: 'article'
      })

      console.log('✅ Successfully ingested sheep health content')
      return result
    } catch (error) {
      console.error('❌ Failed to ingest sheep health content:', error)
      return false
    }
  }

  /**
   * Ingest sample pasture management content
   */
  static async ingestPastureManagementContent(): Promise<boolean> {
    const pastureContent = `
      Pasture management for sheep farming focuses on maintaining healthy grasslands while maximizing productivity.

      Key principles of pasture management:
      
      Grass species selection:
      - Choose grasses suited to your climate and soil conditions
      - Mix legumes like clover for nitrogen fixation
      - Consider drought-resistant varieties for dry regions

      Soil health maintenance:
      - Regular soil testing every 2-3 years
      - Lime application to maintain proper pH (6.0-7.0)
      - Fertilization based on soil test results

      Grazing management:
      - Implement rotational grazing systems
      - Allow grass to recover between grazing periods
      - Monitor grass height: graze at 6-8 inches, move at 2-3 inches
      - Avoid overgrazing which damages root systems

      Seasonal considerations:
      - Spring: rapid grass growth, monitor for bloat risk
      - Summer: drought stress, provide shade and water
      - Fall: prepare pastures for winter
      - Winter: protect grass from trampling when wet

      Infrastructure needs:
      - Reliable fencing systems
      - Water access in all paddocks
      - Handling facilities for sheep management
      - Storage for hay and feed supplements

      Weed management:
      - Regular mowing to control weeds
      - Spot treatment of problem weeds
      - Maintain dense grass stands to prevent weed establishment
    `

    try {
      const result = await KnowledgeBaseStore.ingestContent({
        url: 'https://extension.edu/pasture-management-sheep',
        title: 'Pasture Management for Sheep Farming',
        content: pastureContent,
        sourceType: 'document'
      })

      console.log('✅ Successfully ingested pasture management content')
      return result
    } catch (error) {
      console.error('❌ Failed to ingest pasture management content:', error)
      return false
    }
  }

  /**
   * Ingest all sample content for comprehensive testing
   */
  static async ingestAllSampleContent(): Promise<void> {
    console.log('🚀 Starting KB ingestion POC...')
    
    const results = await Promise.all([
      this.ingestSheepGrazingContent().catch(() => false),
      this.ingestSheepHealthContent().catch(() => false),
      this.ingestPastureManagementContent().catch(() => false)
    ])

    const successful = results.filter(r => r === true).length
    const failed = results.length - successful

    console.log(`📊 Ingestion complete: ${successful} successful, ${failed} failed`)
    
    // Show KB statistics
    const stats = KnowledgeBaseStore.getStats()
    console.log('📈 KB Statistics:', {
      totalSources: stats.totalSources,
      totalChunks: stats.totalChunks,
      sourceTypes: stats.sourceTypes,
      lastUpdated: stats.lastUpdated
    })
  }

  /**
   * Test KB query functionality
   */
  static async testKBQuery(query: string, topK: number = 3): Promise<void> {
    console.log(`🔍 Testing KB query: "${query}"`)
    
    try {
      const result = await KnowledgeBaseStore.query(query, topK)
      
      console.log(`📋 Query results:`)
      console.log(`- Retrieved ${result.chunks.length} chunks`)
      console.log(`- From ${result.sources.size} sources`)
      console.log(`- Total chunks in KB: ${result.totalChunks}`)
      
      result.chunks.forEach((chunk, index) => {
        console.log(`\n📄 Chunk ${index + 1}:`)
        console.log(`- Similarity: ${chunk.similarity?.toFixed(3)}`)
        console.log(`- Source: ${chunk.metadata.title}`)
        console.log(`- URL: ${chunk.metadata.sourceUrl}`)
        console.log(`- Content: ${chunk.content.substring(0, 200)}...`)
      })
      
    } catch (error) {
      console.error('❌ Query failed:', error)
    }
  }

  /**
   * Demo the complete RAG workflow
   */
  static async demoRAGWorkflow(): Promise<void> {
    console.log('🎬 Starting RAG workflow demo...')
    
    // Step 1: Ingest content
    await this.ingestAllSampleContent()
    
    // Step 2: Test various queries
    const testQueries = [
      'sheep grazing tips',
      'sheep health monitoring',
      'pasture management best practices',
      'rotational grazing benefits',
      'sheep parasite management'
    ]
    
    for (const query of testQueries) {
      await this.testKBQuery(query)
      console.log('\n' + '='.repeat(50) + '\n')
    }
    
    console.log('✅ RAG workflow demo complete!')
  }

  /**
   * Clear all KB content (for testing)
   */
  static clearKnowledgeBase(): boolean {
    console.log('🧹 Clearing knowledge base...')
    const result = KnowledgeBaseStore.clearAll()
    console.log(result ? '✅ KB cleared successfully' : '❌ Failed to clear KB')
    return result
  }
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).KBIngestionPOC = KBIngestionPOC
  console.log('💡 KB Ingestion POC available as window.KBIngestionPOC')
  console.log('💡 Try: KBIngestionPOC.demoRAGWorkflow()')
}