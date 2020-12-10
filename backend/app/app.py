import json
import os

def lambda_handler(event, context):

    headers = event['headers']
    origin = headers.get('Origin', headers.get('origin', None))
    if origin not in os.environ['CorsAllowedOrigins'].split(','):
        origin = None

    return {
        'headers': {
            "Access-Control-Allow-Origin": origin
        },
        "statusCode": 200,
        "body": json.dumps({
            "message": "hello world!",
        }),
    }

def job(event, context):
    return "job ran"
