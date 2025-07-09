// Test script for the logs endpoint
async function testLogsEndpoint() {
  const testPayload = {
    type: 'animal_update',
    originalMessage: 'Got a new ewe lamb. Katahdin. 7 mo. body type 3.',
    structured: {
      species: 'sheep',
      breed: 'Katahdin',
      age_months: 7,
      body_condition: 3
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/logs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Log inserted with ID:', result.id);
      console.log('Full response:', result);
    } else {
      console.log('❌ Error:', result);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testLogsEndpoint();