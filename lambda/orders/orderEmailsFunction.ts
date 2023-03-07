import { Context, SNSMessage, SQSEvent } from 'aws-lambda'
import { AWSError, SES } from 'aws-sdk'
import { Envelope, OrderEvent } from '/opt/nodejs/ordersEventsLayer'

import * as AWSXRay from 'aws-xray-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'
AWSXRay.captureAWS(require('aws-sdk'))

const sesClient = new SES()
export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  //event.Records -> Recebemos os eventos da fila
  const promises: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] = []
  event.Records.forEach(async (record) => {
    const body = JSON.parse(record.body) as SNSMessage
    promises.push(sendOrderEmail(body))
  })
  await Promise.all(promises)
  return
}

const sendOrderEmail = (body: SNSMessage) => {
  const envelope = JSON.parse(body.Message) as Envelope
  const event = JSON.parse(envelope.data) as OrderEvent

  return sesClient
    .sendEmail({
      Destination: {
        ToAddresses: [event.email],
      },
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: `Recebemos seu pedido de numero: ${event.orderId}, no valor de: R$ ${event.billing.totalPrice}`,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Recebemos seu pedido!',
        },
      },
      Source: 'gabrielmatuk14@gmail.com',
      ReplyToAddresses: ['gabrielmatuk13@gmail.com'],
    })
    .promise()
}
