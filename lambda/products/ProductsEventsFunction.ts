import { Callback, Context } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { ProductEvent } from '/opt/nodejs/productEventsLayer'
import * as AWSXRay from 'aws-xray-sdk'

AWSXRay.captureAWS(require('aws-sdk'))

const eventsDbd = process.env.EVENTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

export const handler = async (
  event: ProductEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  await createEvent(event)

  callback(
    null,
    JSON.stringify({
      productEventCreated: true,
      message: 'ok',
    })
  )
}

const createEvent = (event: ProductEvent) => {
  const timestamp = Date.now()
  const ttl = ~~(timestamp / 1000 + 5 * 60) //~ serve para arrendodar

  return ddbClient
    .put({
      TableName: eventsDbd,
      Item: {
        pk: `#product_${event.productCode}`,
        sk: `${event.eventType}#${timestamp}`,
        email: event.email,
        createdAt: timestamp,
        requestId: event.requestId,
        eventType: event.eventType,
        info: {
          productId: event.productId,
          price: event.productPrice,
        },
        ttl: ttl,
      },
    })
    .promise()
}
