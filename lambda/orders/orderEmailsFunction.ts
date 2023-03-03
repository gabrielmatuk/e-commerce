import { Context, SQSEvent } from 'aws-lambda'
import * as AWSXRay from 'aws-xray-sdk'

AWSXRay.captureAWS(require('aws-sdk'))

export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  event.Records.forEach((record) => {
    console.log(record)
    const body = JSON.parse(record.body)
    console.log(body)
  })
  return
}
