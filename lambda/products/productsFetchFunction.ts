import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { ProductRepository } from '/opt/nodejs/productsLayer'
import { DynamoDB } from 'aws-sdk'

const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDdb)

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod

  //Buscar as informacoes do LAMBDA
  const lambdaRequestId = context.awsRequestId
  //Buscar informacao da API GATEWAY
  const apiRequestId = event.requestContext.requestId
  //Logs geram custo! E MEMORIA!!!!!!!
  console.log(
    `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`
  )
  if (event.resource === '/products') {
    if (method === 'GET') {
      console.log('GET!')
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'GET Products - OK',
        }),
      }
    }
  } else if (event.resource === '/products/{id}') {
    const productId = event.pathParameters!.id as string
    console.log(`GET /products/${productId}`)
    return {
      statusCode: 200,
      body: `GET /products/${productId}`,
    }
  }
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'Bad request!',
    }),
  }
}
