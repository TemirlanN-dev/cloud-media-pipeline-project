import express from 'express';
import cors from 'cors';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

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

    // Insert record into Supabase PostgreSQL
    try {
        const query = 'INSERT INTO jobs (input_key, status) VALUES ($1, $2)';
        const values = [fileKey, 'Pending'];
        await pool.query(query, values);
        console.log(`[DB] Created Pending record for: ${fileKey}$`);

    } catch (dbError) {
        console.error('[DB Error]: Failed to create record', dbError);
    }

    return res.status(200).json({ uploadUrl: presignedUrl, fileKey });
  } catch (error) {
    console.error('Error generating Presigned URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));