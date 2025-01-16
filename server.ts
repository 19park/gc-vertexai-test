// server.js
const express = require('express');
const multer = require('multer');
const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// PDF 분석 함수
async function analyzePDF(filePath, projectId) {
  const vertexAI = new VertexAI({
    project: projectId,
    location: 'asia-northeast3'
  });

  const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash-001',
  });

  const fileBuffer = fs.readFileSync(filePath);
  const base64File = fileBuffer.toString('base64');

  const filePart = {
    inlineData: {
      data: base64File,
      mimeType: 'application/pdf'
    }
  };

  const textPart = {
    text: `You are a contract manager for a waste collection and transport provider.
We summarize the documentation provided and extract only the information necessary to register the contract on the system website.
We want to format the results in Markdown format.
Please configure the language as Korean.
The required information is:

- Contract period
- Type of service
- Contract unit price
- Base rate
- Tax classification (VAT)
- Settlement reference date
- Payment date
- Discharger
- Collection and transporter
- Processor
- Business name
- Business address
- Monthly base amount of emissions
- Monthly base unit of emissions
- Depositor/bank name/account number
- Contract conclusion date`
  };

  const request = {
    contents: [{ role: 'user', parts: [filePart, textPart] }],
  };

  const response = await generativeModel.generateContent(request);
  return response.response;
}

// PDF 업로드 및 분석 엔드포인트
app.post('/analyze', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const result = await analyzePDF(req.file.path, process.env.GCP_PROJECT_ID);

    // 임시 파일 삭제
    fs.unlinkSync(req.file.path);

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});