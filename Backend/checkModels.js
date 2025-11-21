const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testNewModels() {
  console.log("🔑 API Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");
  console.log("\n📋 Testing NEW model names...\n");

  const modelsToTest = [
    'models/gemini-2.5-pro',
    'models/gemini-2.5-flash',
  ];

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hello");
      const response = await result.response;
      console.log(`✅ ${modelName} - WORKING!`);
      console.log(`Response: ${response.text().substring(0, 50)}...`);
    } catch (error) {
      console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}`);
    }
    console.log('---');
  }
}

testNewModels().catch(console.error);