#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { kbStore } from '../agents/kb-store';

// Load environment variables
config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sample data for ingestion
const sampleDocuments = [
  {
    text: "Pasture management is crucial for livestock health and productivity. Proper rotation of grazing areas prevents overgrazing and maintains soil health. The key is to move animals before they damage the grass root system.",
    metadata: {
      source: "pasture-management-guide",
      type: "educational",
      sourceId: "doc-001",
      chunkIndex: 0,
      topic: "grazing-management",
    },
  },
  {
    text: "Cattle nutrition requirements vary by season and growth stage. During winter months, cattle need higher energy feeds to maintain body temperature. Protein requirements increase during breeding season and lactation.",
    metadata: {
      source: "cattle-nutrition-handbook",
      type: "educational", 
      sourceId: "doc-002",
      chunkIndex: 0,
      topic: "nutrition",
    },
  },
  {
    text: "Fence maintenance is essential for livestock safety and property boundaries. Regular inspection should include checking for loose wires, damaged posts, and proper gate function. Electric fencing requires testing voltage levels monthly.",
    metadata: {
      source: "farm-infrastructure-guide",
      type: "maintenance",
      sourceId: "doc-003", 
      chunkIndex: 0,
      topic: "infrastructure",
    },
  },
  {
    text: "Water quality testing should be conducted annually for livestock drinking water. Test for bacteria, nitrates, sulfates, and pH levels. Poor water quality can lead to reduced feed intake and livestock performance.",
    metadata: {
      source: "water-quality-standards",
      type: "safety",
      sourceId: "doc-004",
      chunkIndex: 0,
      topic: "water-management",
    },
  },
  {
    text: "Seasonal breeding programs help optimize calving timing and management. Spring calving allows for better pasture utilization while fall calving can take advantage of cooler weather. Consider your local climate and market conditions.",
    metadata: {
      source: "breeding-strategies",
      type: "educational",
      sourceId: "doc-005",
      chunkIndex: 0,
      topic: "breeding",
    },
  },
];

// Generate embedding for a single text
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Generate embeddings for all sample documents
async function generateEmbeddings(documents: typeof sampleDocuments): Promise<Array<{
  text: string;
  embedding: number[];
  metadata: any;
}>> {
  console.log('Generating embeddings for sample documents...');
  
  const chunks = [];
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`Processing document ${i + 1}/${documents.length}: ${doc.text.substring(0, 50)}...`);
    
    const embedding = await generateEmbedding(doc.text);
    chunks.push({
      text: doc.text,
      embedding,
      metadata: doc.metadata,
    });
    
    // Add a small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return chunks;
}

// Main ingestion function
async function ingestSampleData() {
  try {
    console.log('Starting KB ingestion process...');
    
    // Initialize KB store
    console.log('Initializing KB store...');
    await kbStore.initialize();
    
    // Generate embeddings for sample documents
    const chunks = await generateEmbeddings(sampleDocuments);
    
    // Insert chunks into KB
    console.log('Inserting chunks into KB...');
    const insertedIds = await kbStore.insertChunks(chunks);
    
    console.log(`Successfully inserted ${insertedIds.length} chunks into KB`);
    
    // Get KB statistics
    const stats = await kbStore.getStats();
    console.log('KB Statistics:', stats);
    
    // Test a sample search
    console.log('Testing vector search...');
    const testQuery = "How to manage cattle grazing?";
    const testEmbedding = await generateEmbedding(testQuery);
    
    const searchResults = await kbStore.semanticSearch(testEmbedding, {
      limit: 3,
      threshold: 0.6,
    });
    
    console.log(`Search results for "${testQuery}":`);
    searchResults.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   Text: ${result.chunk.text.substring(0, 100)}...`);
      console.log(`   Source: ${result.chunk.metadata.source}`);
      console.log(`   Topic: ${result.chunk.metadata.topic}`);
      console.log('');
    });
    
    console.log('Sample data ingestion completed successfully!');
    
  } catch (error) {
    console.error('Error during ingestion:', error);
    throw error;
  }
}

// Run the ingestion if this script is called directly
if (require.main === module) {
  ingestSampleData()
    .then(() => {
      console.log('Ingestion script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ingestion script failed:', error);
      process.exit(1);
    });
}

export { ingestSampleData, generateEmbedding };