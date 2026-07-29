import os
import urllib.parse
import boto3

ecs_client = boto3.client('ecs')

def lambda_handler(event, context):
    # 1. Parse S3 Event data
    bucket_name = event['Records'][0]['s3']['bucket']['name']
    raw_key = event['Records'][0]['s3']['object']['key']
    
    # URL decode the object key (handles spaces/special chars in filenames)
    object_key = urllib.parse.unquote_plus(raw_key)
    
    print(f"File uploaded: {object_key} to bucket: {bucket_name}")
    
    # 2. Configuration Parameters (Replace with your actual values)
    CLUSTER_NAME = 'media-worker-cluster'
    TASK_DEFINITION = 'media-worker-tast'
    
    # Update these with your VPC Subnet IDs and Security Group ID
    SUBNETS = ['subnet-0b736812913bfce84', 'subnet-0261c15d2432830e3'] 
    SECURITY_GROUPS = ['sg-0d50893e5e846ad07']
    
    # 3. Call ECS RunTask API
    response = ecs_client.run_task(
        cluster=CLUSTER_NAME,
        launchType='FARGATE',
        taskDefinition=TASK_DEFINITION,
        count=1,
        platformVersion='LATEST',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': SUBNETS,
                'securityGroups': SECURITY_GROUPS,
                'assignPublicIp': 'ENABLED' # Allows container to reach internet to pull image/packages
            }
        },
        overrides={
            'containerOverrides': [
                {
                    'name': 'media-worker-container', # Must match the container name in your Task Definition
                    'environment': [
                        {
                            'name': 'OBJECT_KEY',
                            'value': object_key
                        },
                        {
                            'name': 'INPUT_BUCKET',
                            'value': bucket_name
                        },
                        {
                            'name': 'OUTPUT_BUCKET', # Replace with your actual output bucket name
                            'value': 'media-output-bucket-123456' 
                        }
                    ]
                }
            ]
        }
    )
    
    print(f"Triggered ECS Task ARN: {response['tasks'][0]['taskArn']}")
    return {
        'statusCode': 200,
        'body': f"Successfully launched task for {object_key}"
    }