import { DynamoDB } from 'aws-sdk'
import { SNSEvent, Context, SNSMessage } from 'aws-lambda'
import {
  OrderEventDdb,
  OrderEventRepository,
} from '/opt/nodejs/ordersEventsRepositoryLayer'
import { Envelope, OrderEvent } from '/opt/nodejs/ordersEventsLayer'

import * as AWSXRay from 'aws-xray-sdk'
AWSXRay.captureAWS(require('aws-sdk'))

const eventsDbd = process.env.EVENTS_DDB!

const ddbClient = new DynamoDB.DocumentClient()
const orderEventsRepository = new OrderEventRepository(ddbClient, eventsDbd)

export const handler = async (
  event: SNSEvent,
  context: Context
): Promise<void> => {
  return
}

const createEvent = (body: SNSMessage) => {
  const envelope = JSON.parse(body.Message) as Envelope
  const event = JSON.parse(envelope.data) as OrderEvent

  console.log(`Order event - MessageId: ${body.MessageId}`)

  const timestamp = Date.now()
  const ttl = ~~(timestamp / 1000 + 5 * 60)

  const orderEventDbd: OrderEventDdb = {
    pk: `#order_${event.orderId}`,
    sk: `${envelope.eventType}#${timestamp}`,
    ttl: ttl,
    email: event.email,
    createdAt: timestamp,
    requestId: event.requestId,
    eventType: envelope.eventType,
    info: {
      orderId: event.orderId,
      productCodes: event.productCodes,
      messageId: body.MessageId,
    },
  }
  return orderEventsRepository.createOrderEvent(orderEventDbd)
}
