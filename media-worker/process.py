import os
import psycopg2
import boto3
import ffmpeg

# Initialize S3 Client (It automatically reads your AWS credentials from your environment)
s3 = boto3.client('s3')

def process_video(input_bucket, output_bucket, object_key):
    # Extract just the filename in case the key includes folder paths (e.g., 'uploads/video.mp4')
    filename = os.path.basename(object_key)
    
    # 1. Setup temporary file paths for the container
    download_path = f"/tmp/raw_{filename}"
    upload_path = f"/tmp/processed_{filename}"
    processed_key = f"processed/{filename}"

    try:
        # 2. Download the raw video from the S3 Input Bucket
        print(f"Downloading {object_key} from {input_bucket}...")
        s3.download_file(input_bucket, object_key, download_path)

        # 3. Process with FFmpeg (Scale to 720p)
        print("Processing video to 720p...")
        (
            ffmpeg
            .input(download_path)
            # -2 automatically maintains aspect ratio based on the 720 height
            .output(upload_path, vf='scale=-2:720')
            .overwrite_output()
            .run(quiet=True)
        )

        # 4. Upload the processed video to the S3 Output Bucket
        print(f"Uploading {processed_key} to {output_bucket}...")
        s3.upload_file(upload_path, output_bucket, processed_key)
        print("Processing and upload complete!")

        # 5. Database Update (Inside the try block, so it only runs if upload succeeds)
        print("Video uploaded! Updating database status to Completed...")
        try:
            # Connect to the database
            conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
            cur = conn.cursor()
            
            # Update the record where the input_key matches
            cur.execute(
                "UPDATE jobs SET status = 'Completed' WHERE input_key = %s", 
                (object_key,)
            )
            conn.commit()
            cur.close()
            conn.close()
            print("Database updated successfully!")
            
        except Exception as db_error:
            print(f"Failed to update database: {db_error}")

    except Exception as e:
        print(f"CRITICAL ERROR processing video: {e}")

    finally:
        # 6. Clean up local container storage (Prevent memory leaks)
        print("Cleaning up temporary files...")
        if os.path.exists(download_path):
            os.remove(download_path)
        if os.path.exists(upload_path):
            os.remove(upload_path)

if __name__ == "__main__":
    # We use environment variables so AWS can inject these dynamically later
    INPUT_BUCKET = os.environ.get("INPUT_BUCKET")
    OUTPUT_BUCKET = os.environ.get("OUTPUT_BUCKET")
    OBJECT_KEY = os.environ.get("OBJECT_KEY")

    if not all([INPUT_BUCKET, OUTPUT_BUCKET, OBJECT_KEY]):
        print("Missing required environment variables. Exiting.")
    else:
        process_video(INPUT_BUCKET, OUTPUT_BUCKET, OBJECT_KEY)