import express from 'express';
import cors from 'cors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize S3 Client with restricted IAM credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    // Create a unique object key (e.g., prefixing with a timestamp)
    const fileKey = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_INPUT_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    // Security: Expiration set to 300 seconds (5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return res.status(200).json({ uploadUrl: presignedUrl, fileKey });
  } catch (error) {
    console.error('Error generating Presigned URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));