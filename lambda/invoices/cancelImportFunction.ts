import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { ApiGatewayManagementApi, DynamoDB, S3 } from 'aws-sdk'
import * as AWSXray from 'aws-xray-sdk'
import {
  InvoiceTransactionRepository,
  InvoiceTransactionStatus,
} from '/opt/nodejs/invoiceTransaction'
import { InvoiceWSService } from '/opt/nodejs/invoiceWSConnection'

AWSXray.captureAWS(require('aws-sdk'))

const invoicesDdb = process.env.INVOICE_DDB!
const invoicesWsApiEndpoint = process.env.INVOICE_WSAPI_ENDPOINT!.substring(6)

const s3Client = new S3()
const ddbClient = new DynamoDB.DocumentClient()
const apigwManagementApi = new ApiGatewayManagementApi({
  endpoint: invoicesWsApiEndpoint,
})

const invoiceTransactionRepository = new InvoiceTransactionRepository(
  ddbClient,
  invoicesDdb
)

const invoiceWSService = new InvoiceWSService(apigwManagementApi)

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const transactionId = JSON.parse(event.body!).transactionId as string
  const lambdaRequestId = context.awsRequestId
  const connectionId = event.requestContext.connectionId!

  console.log(
    `ConnectionId: ${connectionId} - Lambda RequestId: ${lambdaRequestId}`
  )

  try {
    const invoiceTransaction =
      await invoiceTransactionRepository.getInvoiceTransaction(transactionId)

    if (
      invoiceTransaction.transactionStatus ===
      InvoiceTransactionStatus.GENERATED
    ) {
      await Promise.all([
        invoiceWSService.sendInvoiceStatus(
          transactionId,
          connectionId,
          InvoiceTransactionStatus.CANCELLED
        ),
        invoiceTransactionRepository.updateInvoiceTransaction(
          transactionId,
          InvoiceTransactionStatus.CANCELLED
        ),
      ])
    } else {
      await invoiceWSService.sendInvoiceStatus(
        transactionId,
        connectionId,
        invoiceTransaction.transactionStatus
      )
      console.error(`Can't cancel an ongoing process`)
    }
  } catch (err) {
    console.error((<Error>err).message)
    console.error(
      `Invoice transaction not found - TransactionId: ${transactionId}`
    )

    await invoiceWSService.sendInvoiceStatus(
      transactionId,
      connectionId,
      InvoiceTransactionStatus.NOT_FOUND
    )
  }
  return {
    statusCode: 200,
    body: 'OK',
  }
}
